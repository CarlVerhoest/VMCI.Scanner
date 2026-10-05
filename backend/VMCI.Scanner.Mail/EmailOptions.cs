using System.Security.Cryptography;
using System.Security.Cryptography.Pkcs;
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
    /// Reads the .pfx in managed code and attaches the RSA key as an in-memory (ephemeral) key.
    ///
    /// <para><b>Not <c>X509CertificateLoader.LoadPkcs12FromFile</c></b>, not even with
    /// <c>EphemeralKeySet</c>: that goes through Windows' PFX import, which on the Plesk host — an IIS
    /// application pool without a loaded user profile — fails with "Bad Data." for a CAPI key and "The system
    /// cannot find the file specified." for a CNG key, while the same file loads fine on a development PC
    /// (docs/mail-setup.md, step 7). Decoding the PKCS#12 here and importing the key with
    /// <see cref="RSA.ImportEncryptedPkcs8PrivateKey(ReadOnlySpan{char}, ReadOnlySpan{byte}, out int)"/>
    /// never touches a key store, so the profile does not matter.</para>
    /// </summary>
    /// <exception cref="CryptographicException">Wrong password, or the file holds no RSA key with its certificate.</exception>
    public static X509Certificate2 Load(string path, string password)
    {
        var info = Pkcs12Info.Decode(File.ReadAllBytes(path), out _, skipCopy: true);
        if (info.IntegrityMode == Pkcs12IntegrityMode.Password && !info.VerifyMac(password))
        {
            throw new CryptographicException("The certificate password is incorrect.");
        }

        X509Certificate2? certificate = null;
        RSA? key = null;
        try
        {
            foreach (var contents in info.AuthenticatedSafe)
            {
                if (contents.ConfidentialityMode == Pkcs12ConfidentialityMode.Password)
                {
                    contents.Decrypt(password);
                }

                foreach (var bag in contents.GetBags())
                {
                    switch (bag)
                    {
                        case Pkcs12CertBag { IsX509Certificate: true } certBag when certificate == null:
                            certificate = certBag.GetCertificate();
                            break;
                        case Pkcs12ShroudedKeyBag keyBag when key == null:
                            key = RSA.Create();
                            key.ImportEncryptedPkcs8PrivateKey(password, keyBag.EncryptedPkcs8PrivateKey.Span, out _);
                            break;
                    }
                }
            }

            if (certificate == null || key == null)
            {
                throw new CryptographicException("The .pfx must contain one certificate and its RSA private key.");
            }

            // Throws when the key does not belong to the certificate. The key is not disposed on success:
            // the returned certificate uses it for the application's lifetime.
            return certificate.CopyWithPrivateKey(key);
        }
        catch
        {
            key?.Dispose();
            throw;
        }
        finally
        {
            certificate?.Dispose();
        }
    }
}
