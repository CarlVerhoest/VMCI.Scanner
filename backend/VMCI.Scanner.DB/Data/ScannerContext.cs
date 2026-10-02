using System;
using System.Collections.Generic;
using Microsoft.EntityFrameworkCore;
using VMCI.Scanner.DB.Models;

namespace VMCI.Scanner.DB.Data;

public partial class ScannerContext : DbContext
{
    public ScannerContext(DbContextOptions<ScannerContext> options)
        : base(options)
    {
        // Disable tracking by default for better performance
        ChangeTracker.QueryTrackingBehavior = QueryTrackingBehavior.NoTracking;
    }

    public virtual DbSet<Account> Account { get; set; }

    public virtual DbSet<AccountRole> AccountRole { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.UseCollation("SQL_Latin1_General_CP1_CI_AS");

        modelBuilder.Entity<Account>(entity =>
        {
            entity.HasIndex(e => e.Email, "UQ_Account_Email").IsUnique();

            entity.Property(e => e.Id).HasDefaultValueSql("(newid())", "DF_Account_Id");
            entity.Property(e => e.Email).HasMaxLength(256);
            entity.Property(e => e.FirstName).HasMaxLength(100);
            entity.Property(e => e.PasswordHash).HasMaxLength(200);
            entity.Property(e => e.SurName).HasMaxLength(100);

            entity.HasOne(d => d.AccountRole).WithMany(p => p.Account)
                .HasForeignKey(d => d.AccountRoleId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_Account_AccountRole");
        });

        modelBuilder.Entity<AccountRole>(entity =>
        {
            entity.HasIndex(e => e.Code, "UQ_AccountRole_Code").IsUnique();

            entity.Property(e => e.Id).HasDefaultValueSql("(newid())", "DF_AccountRole_Id");
            entity.Property(e => e.Code).HasMaxLength(20);
            entity.Property(e => e.Name).HasMaxLength(100);
        });

        OnModelCreatingPartial(modelBuilder);
    }

    partial void OnModelCreatingPartial(ModelBuilder modelBuilder);
}
