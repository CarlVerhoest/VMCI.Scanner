namespace VMCI.Scanner.WebApi.Services;

/// <summary>
/// Sends a PDF from the server. There is no implementation yet: the mail service is postponed
/// (docs/scan-app-plan.md, section 0). Until one is registered in Program.cs, the email endpoint
/// answers 503 and the client hides "Mailen naar...". The implementation gets its own project
/// (VMCI.Scanner.Mail), registered only when its configuration is complete.
/// </summary>
public interface IEmailSender
{
    Task SendAsync(EmailMessage message, CancellationToken cancellationToken);
}

public sealed record EmailMessage(
    string To,
    string Subject,
    string Body,
    string AttachmentName,
    byte[] Attachment);

public class EmailOptions
{
    public const string SectionName = "Email";

    /// <summary>Mail services cap message size; a PDF above this is refused with a hint to share it instead.</summary>
    public long MaxMessageBytes { get; set; } = 9_437_184;
}
