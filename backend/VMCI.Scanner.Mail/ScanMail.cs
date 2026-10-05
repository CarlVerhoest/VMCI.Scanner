namespace VMCI.Scanner.Mail;

/// <summary>
/// The mail a recipient receives. **English**, by the owner's decision (docs/mail-setup.md) — an explicit
/// exception to the rule that text people read is Dutch. It comes from a noreply address, so the body
/// names the staff member and says where to turn instead.
/// </summary>
public static class ScanMail
{
    public static EmailMessage Create(string to, string senderName, string senderEmail, string fileName, byte[] pdf)
    {
        var name = string.IsNullOrWhiteSpace(senderName) ? senderEmail : senderName.Trim();
        var subject = Path.GetFileNameWithoutExtension(fileName);

        var body =
            $"Please find attached: {fileName}\n" +
            "\n" +
            $"Sent by {name} ({senderEmail}) via VMCI Scanner.\n" +
            "\n" +
            "--\n" +
            "This email was sent automatically from an address that is not monitored. Please do not reply to it. " +
            $"If you have a question about this document, contact {name} directly at {senderEmail}.\n";

        return new EmailMessage(to, subject, body, fileName, pdf);
    }
}
