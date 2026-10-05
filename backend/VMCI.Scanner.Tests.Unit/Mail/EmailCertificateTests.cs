using System.Security.Cryptography;
using System.Security.Cryptography.X509Certificates;
using VMCI.Scanner.Mail;

namespace VMCI.Scanner.Tests.Unit.Mail;

// A fabricated self-signed certificate, exported the way Export-PfxCertificate does it, is read back by
// the managed loader that the Plesk host needs (no Windows PFX import there).
public sealed class EmailCertificateTests : IDisposable
{
    private const string Password = "Ab\"c\\1";
    private readonly string _path = Path.Combine(Path.GetTempPath(), "scanner-mail-test-" + Guid.NewGuid().ToString("N") + ".pfx");
    private readonly string _thumbprint;

    public EmailCertificateTests()
    {
        using var rsa = RSA.Create(2048);
        var request = new CertificateRequest("CN=VMCI Scanner Mail Test", rsa, HashAlgorithmName.SHA256, RSASignaturePadding.Pkcs1);
        using var certificate = request.CreateSelfSigned(DateTimeOffset.UtcNow.AddDays(-1), DateTimeOffset.UtcNow.AddYears(1));
        _thumbprint = certificate.Thumbprint;
        File.WriteAllBytes(_path, certificate.ExportPkcs12(Pkcs12ExportPbeParameters.Pkcs12TripleDesSha1, Password));
    }

    public void Dispose() => File.Delete(_path);

    [Fact]
    public void Load_ReturnsTheCertificateWithAUsablePrivateKey()
    {
        using var certificate = EmailCertificate.Load(_path, Password);

        Assert.Equal(_thumbprint, certificate.Thumbprint);
        Assert.True(certificate.HasPrivateKey);

        // What ClientCertificateCredential does with it: sign, and the public key verifies.
        var data = "token request"u8.ToArray();
        var signature = certificate.GetRSAPrivateKey()!.SignData(data, HashAlgorithmName.SHA256, RSASignaturePadding.Pkcs1);
        Assert.True(certificate.GetRSAPublicKey()!.VerifyData(data, signature, HashAlgorithmName.SHA256, RSASignaturePadding.Pkcs1));
    }

    [Fact]
    public void Load_WithTheWrongPassword_Throws()
    {
        Assert.ThrowsAny<CryptographicException>(() => EmailCertificate.Load(_path, "wrong"));
    }
}
