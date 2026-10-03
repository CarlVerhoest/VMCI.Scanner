/* =====================================================================================
   Initial schema: the database, AccountRole and Account                  -- 2026-10-02

   WHY THIS EXISTS

   VMCI.Scanner is database-first: SQL Server is the source of truth and the EF Core model is
   scaffolded FROM it (backend/VMCI.Scanner.DB/CLAUDE.md). Every table is created by a dated
   script in this folder, never by EF migrations. This is the first one: the login.

   - AccountRole: the roles a login can have. Seeded with ADMIN ("Beheerder") and
     COWORKER ("Medewerker"). AuthController treats Code = 'ADMIN' as administrator.
   - Account: one row per person who can sign in. PasswordHash is a BCrypt hash, NULL
     until a password has been set (such an account cannot sign in). The first admin
     is created with `VMCI.Scanner.DevTools create-account`, never by pasting a hash here.

   CONVENTIONS EVERY LATER SCRIPT FOLLOWS

   - File name: YYYY-MM-DD-short-description.sql; this header explains WHY, not only what.
   - Re-runnable: every CREATE/ALTER is guarded, so running a script twice is harmless.
   - No USE statement in later scripts: they run connected to the target database, whose
     name differs on the Plesk host. On that host, run THIS script from the AccountRole part
     onward (skip the CREATE DATABASE / USE block); docs/deployment.md.
   - Primary key: Id uniqueidentifier NOT NULL DEFAULT (newid()), named PK_<Table>.
   - Foreign keys: FK_<Table>_<ReferencedTable>, ON DELETE NO ACTION unless the script
     says otherwise and why.
   - Table and column names are the C# names: the scaffolder runs with
     --use-database-names --no-pluralize, so what is written here is what the code sees.
   - After running: re-scaffold (backend/VMCI.Scanner.DB/CLAUDE.md) and record the change at
     the top of that file.
   ===================================================================================== */

IF DB_ID(N'cverhoest_scanner') IS NULL
BEGIN
    CREATE DATABASE [cverhoest_scanner] COLLATE SQL_Latin1_General_CP1_CI_AS;
END
GO

USE [cverhoest_scanner];
GO

IF OBJECT_ID(N'dbo.AccountRole', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.AccountRole
    (
        Id   uniqueidentifier NOT NULL CONSTRAINT DF_AccountRole_Id DEFAULT (newid()),
        Code nvarchar(20)     NOT NULL,
        Name nvarchar(100)    NOT NULL,
        CONSTRAINT PK_AccountRole PRIMARY KEY (Id),
        CONSTRAINT UQ_AccountRole_Code UNIQUE (Code)
    );
END
GO

IF NOT EXISTS (SELECT 1 FROM dbo.AccountRole WHERE Code = N'ADMIN')
    INSERT INTO dbo.AccountRole (Code, Name) VALUES (N'ADMIN', N'Beheerder');
IF NOT EXISTS (SELECT 1 FROM dbo.AccountRole WHERE Code = N'COWORKER')
    INSERT INTO dbo.AccountRole (Code, Name) VALUES (N'COWORKER', N'Medewerker');
GO

IF OBJECT_ID(N'dbo.Account', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Account
    (
        Id            uniqueidentifier NOT NULL CONSTRAINT DF_Account_Id DEFAULT (newid()),
        AccountRoleId uniqueidentifier NOT NULL,
        Email         nvarchar(256)    NOT NULL,
        FirstName     nvarchar(100)    NOT NULL,
        SurName       nvarchar(100)    NOT NULL,
        IsLocked      bit              NOT NULL CONSTRAINT DF_Account_IsLocked DEFAULT (0),
        PasswordHash  nvarchar(200)    NULL,
        CONSTRAINT PK_Account PRIMARY KEY (Id),
        CONSTRAINT UQ_Account_Email UNIQUE (Email),
        CONSTRAINT FK_Account_AccountRole FOREIGN KEY (AccountRoleId) REFERENCES dbo.AccountRole (Id)
    );
END
GO
