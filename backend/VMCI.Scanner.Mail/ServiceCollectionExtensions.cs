using System.Security.Cryptography.X509Certificates;
using Azure.Identity;
using Microsoft.Extensions.DependencyInjection;

namespace VMCI.Scanner.Mail;

public static class ServiceCollectionExtensions
{
    /// <summary>
    /// Registers <see cref="IEmailSender"/> as <see cref="GraphEmailSender"/>. Program.cs calls this only when
    /// <see cref="EmailOptions.IsComplete"/> and the certificate has loaded, so the API keeps starting without
    /// mail. One credential for the application's lifetime: Azure.Identity caches the token in it.
    /// </summary>
    public static IServiceCollection AddGraphEmailSender(this IServiceCollection services, EmailOptions options, X509Certificate2 certificate)
    {
        var credential = new ClientCertificateCredential(options.TenantId, options.ClientId, certificate);
        services.AddSingleton(new GraphMailSettings(credential, options.SenderAddress));

        services.AddHttpClient<IEmailSender, GraphEmailSender>(http =>
        {
            http.BaseAddress = new Uri(GraphEmailSender.GraphBaseAddress);
            // A 9 MB PDF from the Plesk host in 3 MB chunks; the client waits 120 seconds.
            http.Timeout = TimeSpan.FromSeconds(100);
        });

        return services;
    }
}
