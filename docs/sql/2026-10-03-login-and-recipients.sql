/* =====================================================================================
   Cookie login, forced first password change, and recipients            -- 2026-10-03

   WHY THIS EXISTS

   The owner creates every account personally in the admin screen, with a simple temporary
   password handed over outside the system. A user then stays signed in on a device for
   good (a persistent, sliding cookie) until they log off. See docs/scan-app-plan.md,
   section 0.

   - Account.MustChangePassword: set when an administrator creates an account or resets its
     password. While it is 1, the API allows nothing but changing the password (and me /
     logout). The user's own new password clears it.
   - Account.SecurityStamp: copied into the cookie at login and compared on EVERY request.
     Locking an account or changing its password writes a new stamp, which rejects every
     device signed in with the old one on its next request. Without it, a cookie that lives
     ~400 days could not be revoked.
   - Recipient: the fixed addresses a user may mail a PDF to. A user adds one from the
     result screen; only an administrator removes one. Email is unique per account, not
     globally - two users may both mail the same accountant.

   ON DELETE NO ACTION for Recipient -> Account: accounts are locked, not deleted, so a
   delete is never expected; if one ever is, it must remove the recipients explicitly.

   No USE statement: run it CONNECTED TO the target database (locally cverhoest_scanner; on
   the Plesk host the database has another name) - sqlcmd -d <database>, or pick the
   database in SSMS. Only the initial schema script names a database. docs/deployment.md.

   After running: re-scaffold (backend/VMCI.Scanner.DB/CLAUDE.md).
   ===================================================================================== */

IF COL_LENGTH(N'dbo.Account', N'MustChangePassword') IS NULL
BEGIN
    ALTER TABLE dbo.Account
        ADD MustChangePassword bit NOT NULL
            CONSTRAINT DF_Account_MustChangePassword DEFAULT (0);
END
GO

IF COL_LENGTH(N'dbo.Account', N'SecurityStamp') IS NULL
BEGIN
    ALTER TABLE dbo.Account
        ADD SecurityStamp uniqueidentifier NOT NULL
            CONSTRAINT DF_Account_SecurityStamp DEFAULT (newid());
END
GO

IF OBJECT_ID(N'dbo.Recipient', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Recipient
    (
        Id        uniqueidentifier NOT NULL CONSTRAINT DF_Recipient_Id DEFAULT (newid()),
        AccountId uniqueidentifier NOT NULL,
        Email     nvarchar(256)    NOT NULL,
        Label     nvarchar(100)    NULL,
        CreatedAt datetime2(0)     NOT NULL CONSTRAINT DF_Recipient_CreatedAt DEFAULT (sysutcdatetime()),
        CONSTRAINT PK_Recipient PRIMARY KEY (Id),
        CONSTRAINT UQ_Recipient_AccountId_Email UNIQUE (AccountId, Email),
        CONSTRAINT FK_Recipient_Account FOREIGN KEY (AccountId) REFERENCES dbo.Account (Id)
    );
END
GO
