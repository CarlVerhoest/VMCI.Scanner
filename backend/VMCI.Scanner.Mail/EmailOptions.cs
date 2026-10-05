using System.Security.Cryptography.X509Certificates;

namespace VMCI.Scanner.Mail;

/// <summary>
/// Section <c>Email</c>. The IDs and the sender are public and sit in the committed appsettings.json;
/// <see cref="CertificatePassword"/> is the only secret and lives in the secrets file. Tenant setup and
/// the record of what exists there: docs/mail-setup.md.
/// </summary>
public class EmailOptions
{
    public const string SectionName = "Email";

    public string TenantId { get; set; } = string.Empty;

    /// <summary>Application (client) ID of the app registration "VMCI Scanner Mail".</summary>
    public string ClientId { get; set; } = string.Empty;

    /// <summary>The shared mailbox the app sends as. Exchange RBAC allows this one mailbox and no other.</summary>
    public string SenderAddress { get; set; } = string.Empty;

    /// <summary>The .pfx; a relative path is relative to the secrets folder (<see cref="ResolveCertificatePath"/>).</summary>
    public string CertificatePath { get; set; } = string.Empty;

    /// <summary>Secret: backend/secrets/appsettings.secrets.json or an environment variable, never a committed file.</summary>
    public string CertificatePassword { get; set; } = string.Empty;

    /// <summary>A PDF above this is refused with a hint to share it instead.</summary>
    public long MaxMessageBytes { get; set; } = 9_437_184;

    public bool IsComplete =>
        !string.IsNullOrWhiteSpace(TenantId) &&
        !string.IsNullOrWhiteSpace(ClientId) &&
        !string.IsNullOrWhiteSpace(SenderAddress) &&
        !string.IsNullOrWhiteSpace(CertificatePath) &&
        !string.IsNullOrEmpty(CertificatePassword);

    /// <summary>
    /// The certificate file as an absolute path. Relative paths resolve against the secrets folder, which is
    /// <c>backend/secrets</c> on a development machine and <c>&lt;site root&gt;/secrets</c> on the server, so
    /// one committed value works in both places.
    /// </summary>
    public string ResolveCertificatePath(string secretsDirectory) =>
        Path.GetFullPath(Path.IsPathRooted(CertificatePath)
            ? CertificatePath
            : Path.Combine(secretsDirectory, CertificatePath));
}

public static class EmailCertificate
{
    /// <summary>
    /// Loads the .pfx with <see cref="X509KeyStorageFlags.EphemeralKeySet"/>: the private key stays in memory.
    /// The IIS application pool on the Plesk host has no user profile to store a key in, and nothing should
    /// land in a machine-wide key store anyway.
    /// </summary>
    public static X509Certificate2 Load(string path, string password) =>
        X509CertificateLoader.LoadPkcs12FromFile(path, password, X509KeyStorageFlags.EphemeralKeySet);
}
