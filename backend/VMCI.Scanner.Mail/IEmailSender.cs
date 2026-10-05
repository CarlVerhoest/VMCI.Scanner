namespace VMCI.Scanner.Mail;

/// <summary>
/// Sends one mail with one PDF attached. Registered only when the <c>Email</c> configuration is complete
/// and the certificate loads (Program.cs); while it is absent the email endpoint answers 503 and the
/// client hides "Mailen naar...".
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

/// <summary>The mail service refused or failed. The message names the Graph status and error code, never document content.</summary>
public sealed class EmailSendException(string message, Exception? innerException = null)
    : Exception(message, innerException);
