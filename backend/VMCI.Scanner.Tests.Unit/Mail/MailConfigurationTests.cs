using VMCI.Scanner.Mail;

namespace VMCI.Scanner.Tests.Unit.Mail;

public class MailConfigurationTests
{
    private static EmailOptions Complete() => new()
    {
        TenantId = "731f7ac2-3189-44d3-b1df-bf5bd3405cfc",
        ClientId = "3b079a6f-457a-4e3a-96f7-5fba81168911",
        SenderAddress = "noreply@vmci.be",
        CertificatePath = "scanner-mail.pfx",
        CertificatePassword = "x",
    };

    [Fact]
    public void Complete_RequiresEveryValue_PasswordIncluded()
    {
        Assert.True(Complete().IsComplete);

        // The committed appsettings.json has everything but the password: mail must stay off there.
        var withoutPassword = Complete();
        withoutPassword.CertificatePassword = "";
        Assert.False(withoutPassword.IsComplete);

        var withoutSender = Complete();
        withoutSender.SenderAddress = " ";
        Assert.False(withoutSender.IsComplete);
    }

    [Fact]
    public void RelativeCertificatePath_ResolvesAgainstTheSecretsFolder()
    {
        var secrets = Path.Combine(Path.GetTempPath(), "site", "secrets");

        Assert.Equal(Path.Combine(secrets, "scanner-mail.pfx"), Complete().ResolveCertificatePath(secrets));
    }

    [Fact]
    public void AbsoluteCertificatePath_IsKept()
    {
        var options = Complete();
        options.CertificatePath = Path.Combine(Path.GetTempPath(), "elsewhere", "cert.pfx");

        Assert.Equal(options.CertificatePath, options.ResolveCertificatePath(Path.GetTempPath()));
    }

    [Fact]
    public void ScanMail_IsEnglish_NamesTheStaffMember_AndSaysTheAddressIsNotMonitored()
    {
        var message = ScanMail.Create("boekhouding@example.com", "Jan Peeters", "jan@vmci.be", "Factuur oktober.pdf", [1, 2, 3]);

        Assert.Equal("boekhouding@example.com", message.To);
        Assert.Equal("Factuur oktober", message.Subject);
        Assert.Equal("Factuur oktober.pdf", message.AttachmentName);
        Assert.Contains("Please find attached: Factuur oktober.pdf", message.Body);
        Assert.Contains("Sent by Jan Peeters (jan@vmci.be) via VMCI Scanner.", message.Body);
        Assert.Contains("not monitored", message.Body);
        Assert.Contains("contact Jan Peeters directly at jan@vmci.be", message.Body);
    }

    [Fact]
    public void ScanMail_WithoutAName_UsesTheEmailAddress()
    {
        var message = ScanMail.Create("a@example.com", "  ", "jan@vmci.be", "Scan.pdf", []);

        Assert.Contains("Sent by jan@vmci.be (jan@vmci.be)", message.Body);
    }
}
