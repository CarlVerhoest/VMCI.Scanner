using System.ComponentModel.DataAnnotations;
using System.Security.Cryptography;
using Azure.Identity;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;
using PdfSharp.Pdf;
using VMCI.Scanner.Mail;
using VMCI.Scanner.WebApi.Configuration;

namespace VMCI.Scanner.DevTools;

/// <summary>
/// send-test-mail: sends one real mail through the same Graph sender, configuration and certificate the API
/// uses, so the tenant setup (docs/mail-setup.md) can be proven without the app. Bypasses the recipient
/// list on purpose: it is a tool for whoever holds the secrets file, not a user.
/// </summary>
public static class SendTestMailCommand
{
    public const string Usage = "send-test-mail --to <address> [--file <pdf>] [--environment <name>]";

    public static async Task<int> RunAsync(string[] args)
    {
        if (!TryParse(args, out var to, out var file, out var explicitEnvironment, out var parseError))
        {
            Console.Error.WriteLine(parseError);
            Console.Error.WriteLine("Usage: " + Usage);
            return 2;
        }

        var environment = AppConfiguration.ResolveEnvironment(explicitEnvironment);
        var options = AppConfiguration.Build(environment).GetSection(EmailOptions.SectionName).Get<EmailOptions>() ?? new EmailOptions();
        if (!options.IsComplete)
        {
            Console.Error.WriteLine(
                $"The Email section is incomplete for environment '{environment}': TenantId, ClientId, SenderAddress, " +
                "CertificatePath and CertificatePassword (secrets file) are all required.");
            return 1;
        }

        var isDevelopment = string.Equals(environment, AppConfiguration.DefaultEnvironment, StringComparison.OrdinalIgnoreCase);
        var certificatePath = options.ResolveCertificatePath(SecretsFile.ResolveDirectory(AppConfiguration.WebApiDirectory(), isDevelopment));

        System.Security.Cryptography.X509Certificates.X509Certificate2 certificate;
        try
        {
            certificate = EmailCertificate.Load(certificatePath, options.CertificatePassword);
        }
        catch (Exception ex) when (ex is CryptographicException or IOException or UnauthorizedAccessException)
        {
            Console.Error.WriteLine($"The certificate {certificatePath} could not be loaded: {ex.Message}");
            return 1;
        }

        byte[] pdf;
        string fileName;
        if (file != null)
        {
            pdf = await File.ReadAllBytesAsync(file);
            fileName = Path.GetFileName(file);
        }
        else
        {
            pdf = BlankPdf();
            fileName = "VMCI Scanner test.pdf";
        }

        Console.WriteLine($"Environment: {environment}");
        Console.WriteLine($"Sender:      {options.SenderAddress}");
        Console.WriteLine($"Certificate: {certificate.Thumbprint}, valid until {certificate.NotAfter:yyyy-MM-dd}");
        Console.WriteLine($"Attachment:  {fileName}, {pdf.Length:N0} bytes, " +
            (pdf.Length <= GraphEmailSender.InlineAttachmentLimit ? "inline (sendMail)" : "draft + upload session"));

        var settings = new GraphMailSettings(
            new ClientCertificateCredential(options.TenantId, options.ClientId, certificate),
            options.SenderAddress);
        using var http = new HttpClient { BaseAddress = new Uri(GraphEmailSender.GraphBaseAddress), Timeout = TimeSpan.FromSeconds(100) };
        var sender = new GraphEmailSender(http, settings, NullLogger<GraphEmailSender>.Instance);

        try
        {
            await sender.SendAsync(
                ScanMail.Create(to, "VMCI Scanner DevTools", options.SenderAddress, fileName, pdf),
                CancellationToken.None);
        }
        catch (Exception ex) when (ex is EmailSendException or AuthenticationFailedException or HttpRequestException)
        {
            Console.Error.WriteLine($"Sending failed: {ex.Message}");
            Console.Error.WriteLine(
                "A 403 right after setup is usually the Exchange permission cache (up to two hours); " +
                "Test-ServicePrincipalAuthorization shows whether the role assignment itself is right. See docs/mail-setup.md.");
            return 1;
        }

        Console.WriteLine($"Sent to {to}. A copy is in the Sent Items of {options.SenderAddress}.");
        return 0;
    }

    // A single blank A4 page: enough to prove delivery, and nothing that needs a font.
    private static byte[] BlankPdf()
    {
        using var document = new PdfDocument();
        document.Info.Title = "VMCI Scanner test";
        document.AddPage();
        using var stream = new MemoryStream();
        document.Save(stream, false);
        return stream.ToArray();
    }

    private static bool TryParse(string[] args, out string to, out string? file, out string? environment, out string error)
    {
        to = string.Empty;
        file = null;
        environment = null;
        error = string.Empty;

        for (var i = 0; i < args.Length; i++)
        {
            var option = args[i].ToLowerInvariant();
            if (option is not ("--to" or "--file" or "--environment"))
            {
                error = $"Unknown option '{args[i]}'.";
                return false;
            }

            if (i + 1 >= args.Length)
            {
                error = $"Missing value for {args[i]}.";
                return false;
            }

            var value = args[++i].Trim();
            switch (option)
            {
                case "--to": to = value; break;
                case "--file": file = value; break;
                case "--environment": environment = value; break;
            }
        }

        if (!new EmailAddressAttribute().IsValid(to) || to.Length == 0)
        {
            error = "--to must be a valid email address.";
            return false;
        }

        if (file != null && !File.Exists(file))
        {
            error = $"The file '{file}' does not exist.";
            return false;
        }

        return true;
    }
}
