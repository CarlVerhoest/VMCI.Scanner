#Requires -Version 7
<#
.SYNOPSIS
    Copies the production data into the local development database, keeping a timestamped .bak.

.DESCRIPTION
    The Plesk host is shared hosting: a BACKUP DATABASE there writes to the host's own disk, which we
    cannot download, and the database user lacks VIEW DEFINITION, so SqlPackage cannot export a
    .bacpac either. What the user CAN do is SELECT. So:

    1. Schema from the LOCAL database: SqlPackage extracts it (no data) and publishes it into a new,
       empty local database <LocalDatabase>_restore. Both databases follow the same scripts in
       docs/sql/, so the schemas should be equal - this is checked per table in step 2.
    2. Data from PRODUCTION: every table of the local schema is read with SELECT * and its columns
       are compared with the local table. Any difference stops the run: run the missing docs/sql
       script on the side that is behind first. (Without VIEW DEFINITION a production table that does
       not exist locally cannot be seen; it is simply not copied.)
    3. The rows go into <LocalDatabase>_restore, parents before children, with constraints checked.
    4. Only when all of that succeeded: the local database is dropped and the restore database takes
       its name. A failed run leaves the local database as it was.
    5. A copy-only backup of the result goes to <backup folder>\<LocalDatabase>_prod_<timestamp>.bak.
       The folder defaults to the local instance's default backup path. The file holds production
       data (accounts, password hashes): it stays outside the repository.

    After a restore the local database has the production accounts: sign in locally with a production
    login. The local Data Protection keys differ from the server's, so sign in again.

    Needs SqlPackage (dotnet tool install -g microsoft.sqlpackage) and Windows authentication to the
    local server with permission to create, drop and back up databases.

.PARAMETER Server
    The production SQL Server as reachable from this PC. NOT the name in
    appsettings.secrets.Production.json, which only the web server can resolve.
    Defaults to $env:SCANNER_PROD_SQL_SERVER, else the Plesk host's public address.

.EXAMPLE
    ./scripts/restore-prod-to-local.ps1
    Asks for the production SQL password, then copies and backs up.
#>
[CmdletBinding()]
param(
    [string]$Server = ($env:SCANNER_PROD_SQL_SERVER ? $env:SCANNER_PROD_SQL_SERVER : '85.17.54.47,784'),
    [string]$Database = 'cverhoest_scanner',
    [string]$User = 'cverhoest_scanner',
    [string]$LocalServer = 'localhost',
    [string]$LocalDatabase = 'cverhoest_scanner',
    [string]$BackupDirectory
)

$ErrorActionPreference = 'Stop'

if (-not (Get-Command sqlpackage -ErrorAction SilentlyContinue)) {
    throw 'SqlPackage not found. Install it with: dotnet tool install -g microsoft.sqlpackage'
}

function New-LocalConnectionString([string]$database) {
    $builder = [System.Data.SqlClient.SqlConnectionStringBuilder]::new()
    $builder['Data Source'] = $LocalServer
    $builder['Initial Catalog'] = $database
    $builder['Integrated Security'] = $true
    return $builder.ConnectionString
}

function Invoke-Query([string]$connectionString, [string]$sql) {
    $connection = [System.Data.SqlClient.SqlConnection]::new($connectionString)
    try {
        $connection.Open()
        $command = $connection.CreateCommand()
        $command.CommandText = $sql
        $command.CommandTimeout = 300
        $table = [System.Data.DataTable]::new()
        $table.Load($command.ExecuteReader())
        return , $table
    }
    finally {
        $connection.Dispose()
    }
}

function Invoke-Step([string]$name, [scriptblock]$command) {
    Write-Host "== $name" -ForegroundColor Cyan
    & $command
    if ($LASTEXITCODE -ne 0) {
        throw "$name failed with exit code $LASTEXITCODE."
    }
}

function Format-Name([string]$name) { '[' + $name.Replace(']', ']]') + ']' }
function Format-Literal([string]$value) { "N'" + $value.Replace("'", "''") + "'" }

$master = New-LocalConnectionString 'master'
$localConnection = New-LocalConnectionString $LocalDatabase
$restoreDatabase = "${LocalDatabase}_restore"
$restoreConnection = New-LocalConnectionString $restoreDatabase

if ([string]::IsNullOrWhiteSpace($BackupDirectory)) {
    $BackupDirectory = (Invoke-Query $master "SELECT CAST(SERVERPROPERTY('InstanceDefaultBackupPath') AS nvarchar(4000)) AS Path").Rows[0].Path
}
$timestamp = Get-Date -Format 'yyyy-MM-dd_HH-mm-ss'
$backupFile = Join-Path $BackupDirectory "${LocalDatabase}_prod_$timestamp.bak"

if ((Invoke-Query $master "SELECT DB_ID($(Format-Literal $LocalDatabase)) AS Id").Rows[0].Id -is [DBNull]) {
    throw "Local database $LocalDatabase does not exist on ${LocalServer}: create it from the docs/sql scripts first."
}

$credential = Get-Credential -UserName $User -Message "SQL login for $Database on $Server"

# The password may contain ';' or quotes: the builder escapes it.
$source = [System.Data.SqlClient.SqlConnectionStringBuilder]::new()
$source['Data Source'] = $Server
$source['Initial Catalog'] = $Database
$source['User ID'] = $credential.UserName
$source['Password'] = $credential.GetNetworkCredential().Password
$source['TrustServerCertificate'] = $true
$source['Encrypt'] = $true

Write-Host "Production: $Database on $Server"
Write-Host "Local:      $LocalDatabase on $LocalServer (replaced only if everything succeeds)"
Write-Host "Backup:     $backupFile"

# --- Tables of the local schema, parents before children ------------------------------------------

$tables = Invoke-Query $localConnection @"
SELECT t.object_id AS Id, s.name AS SchemaName, t.name AS TableName
FROM sys.tables t JOIN sys.schemas s ON s.schema_id = t.schema_id
WHERE t.is_ms_shipped = 0
"@
$references = Invoke-Query $localConnection @"
SELECT DISTINCT parent_object_id AS Child, referenced_object_id AS Parent
FROM sys.foreign_keys WHERE parent_object_id <> referenced_object_id
"@
$ordered = [System.Collections.Generic.List[object]]::new()
$remaining = [System.Collections.Generic.List[object]]::new()
$tables.Rows | ForEach-Object { $remaining.Add($_) }
while ($remaining.Count -gt 0) {
    $placedIds = $ordered | ForEach-Object Id
    $ready = @($remaining | Where-Object {
            $id = $_.Id
            -not ($references.Rows | Where-Object { $_.Child -eq $id -and $_.Parent -notin $placedIds })
        })
    if ($ready.Count -eq 0) { throw 'Circular foreign keys between local tables; cannot order the copy.' }
    $ready | ForEach-Object { $ordered.Add($_); [void]$remaining.Remove($_) }
}

# Columns that take a value on insert (not computed, not rowversion), per table.
$columns = Invoke-Query $localConnection @"
SELECT c.object_id AS TableId, c.name AS ColumnName
FROM sys.columns c JOIN sys.tables t ON t.object_id = c.object_id
WHERE c.is_computed = 0 AND TYPE_NAME(c.system_type_id) <> 'timestamp'
"@

# --- Read production -------------------------------------------------------------------------------

Write-Host '== Read production' -ForegroundColor Cyan
# Parents are read before children; a row added in production between two reads can make a later
# foreign key check fail - just run again.
$data = @{}
foreach ($table in $ordered) {
    $fullName = "$(Format-Name $table.SchemaName).$(Format-Name $table.TableName)"
    $localColumns = @($columns.Rows | Where-Object TableId -eq $table.Id | ForEach-Object ColumnName)
    $rows = Invoke-Query $source.ConnectionString "SELECT * FROM $fullName"
    $prodColumns = @($rows.Columns | ForEach-Object ColumnName)

    $missingInProd = @($localColumns | Where-Object { $_ -notin $prodColumns })
    $missingLocally = @($prodColumns | Where-Object { $_ -notin $localColumns })
    if ($missingInProd -or $missingLocally) {
        throw ("Schema differs for ${fullName}. Only local: [$($missingInProd -join ', ')]. " +
            "Only in production: [$($missingLocally -join ', ')]. Run the missing docs/sql script first.")
    }
    $data[$fullName] = $rows
    Write-Host "   $fullName : $($rows.Rows.Count) rows"
}

# --- Empty copy of the local schema ----------------------------------------------------------------

$dropRestore = "IF DB_ID($(Format-Literal $restoreDatabase)) IS NOT NULL BEGIN ALTER DATABASE $(Format-Name $restoreDatabase) SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE $(Format-Name $restoreDatabase); END"
Invoke-Query $master $dropRestore | Out-Null

$dacpac = Join-Path ([System.IO.Path]::GetTempPath()) "${LocalDatabase}_schema_$timestamp.dacpac"
try {
    Invoke-Step 'Extract local schema' {
        sqlpackage /Action:Extract /SourceServerName:"$LocalServer" /SourceDatabaseName:"$LocalDatabase" /SourceTrustServerCertificate:True /TargetFile:"$dacpac" /p:ExtractAllTableData=false /Quiet:True
    }
    Invoke-Step "Create $restoreDatabase" {
        sqlpackage /Action:Publish /SourceFile:"$dacpac" /TargetServerName:"$LocalServer" /TargetDatabaseName:"$restoreDatabase" /TargetTrustServerCertificate:True /Quiet:True
    }
}
finally {
    Remove-Item $dacpac -ErrorAction SilentlyContinue
}

# --- Copy the rows ---------------------------------------------------------------------------------

Write-Host "== Copy rows into $restoreDatabase" -ForegroundColor Cyan
try {
    $options = [System.Data.SqlClient.SqlBulkCopyOptions]::KeepIdentity -bor
        [System.Data.SqlClient.SqlBulkCopyOptions]::KeepNulls -bor
        [System.Data.SqlClient.SqlBulkCopyOptions]::CheckConstraints
    foreach ($table in $ordered) {
        $fullName = "$(Format-Name $table.SchemaName).$(Format-Name $table.TableName)"
        $bulk = [System.Data.SqlClient.SqlBulkCopy]::new($restoreConnection, $options)
        try {
            $bulk.DestinationTableName = $fullName
            $bulk.BulkCopyTimeout = 300
            foreach ($column in $data[$fullName].Columns) {
                [void]$bulk.ColumnMappings.Add($column.ColumnName, $column.ColumnName)
            }
            $bulk.WriteToServer($data[$fullName])
        }
        finally {
            $bulk.Close()
        }
    }
}
catch {
    Invoke-Query $master $dropRestore | Out-Null
    throw
}

# --- Swap and back up ------------------------------------------------------------------------------

Write-Host "== Replace $LocalDatabase" -ForegroundColor Cyan
# The bulk copy's pooled connections would keep the restore database open, and a rename needs it
# exclusively. Separate statements, restore database first: if it cannot be locked, the local
# database has not been touched yet.
[System.Data.SqlClient.SqlConnection]::ClearAllPools()
Invoke-Query $master "ALTER DATABASE $(Format-Name $restoreDatabase) SET SINGLE_USER WITH ROLLBACK IMMEDIATE" | Out-Null
# ROLLBACK IMMEDIATE disconnects a running local API; it reconnects on its next request.
Invoke-Query $master "ALTER DATABASE $(Format-Name $LocalDatabase) SET SINGLE_USER WITH ROLLBACK IMMEDIATE" | Out-Null
Invoke-Query $master "DROP DATABASE $(Format-Name $LocalDatabase)" | Out-Null
Invoke-Query $master "ALTER DATABASE $(Format-Name $restoreDatabase) MODIFY NAME = $(Format-Name $LocalDatabase)" | Out-Null
Invoke-Query $master "ALTER DATABASE $(Format-Name $LocalDatabase) SET MULTI_USER" | Out-Null

Write-Host '== Back up' -ForegroundColor Cyan
Invoke-Query $master "BACKUP DATABASE $(Format-Name $LocalDatabase) TO DISK = $(Format-Literal $backupFile) WITH COPY_ONLY, INIT" | Out-Null

Write-Host "Production data restored into $LocalDatabase. Backup: $backupFile" -ForegroundColor Green
