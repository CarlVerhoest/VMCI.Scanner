using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.DependencyInjection;
using VMCI.Scanner.Claude;
using VMCI.Scanner.Pdf;

namespace VMCI.Scanner.Tests.Integration;

[Collection(ApiCollection.Name)]
public class DocumentsTests
{
    private const string Password = "Geheim123";
    private readonly ScannerWebApplicationFactory _factory;

    public DocumentsTests(ScannerWebApplicationFactory factory)
    {
        _factory = factory;
    }

    private async Task<HttpClient> SignedInClientAsync()
    {
        var email = await _factory.SeedAccountAsync(Password);
        var client = _factory.CreateCookieClient();
        var response = await client.PostAsJsonAsync("/api/auth/login", new { email, password = Password });
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        return client;
    }

    private static MultipartFormDataContent Pages(params byte[][] pages)
    {
        var form = new MultipartFormDataContent();
        for (var i = 0; i < pages.Length; i++)
        {
            var part = new ByteArrayContent(pages[i]);
            part.Headers.ContentType = new MediaTypeHeaderValue("image/png");
            form.Add(part, "pages", $"page{i + 1}.png");
        }
        form.Add(new StringContent("Factuur oktober"), "fileName");
        return form;
    }

    [Fact]
    public async Task CreatePdf_WithoutOcr_ReturnsAnImagePdfMarkedNotSearchable()
    {
        var client = await SignedInClientAsync();

        var response = await client.PostAsync("/api/documents/pdf",
            Pages(TestImages.Png(60, 80), TestImages.Png(80, 60)));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("application/pdf", response.Content.Headers.ContentType?.MediaType);
        Assert.Equal("false", Assert.Single(response.Headers.GetValues("X-Searchable")));
        Assert.Equal("Factuur oktober.pdf", response.Content.Headers.ContentDisposition?.FileNameStar);

        var pdf = await response.Content.ReadAsByteArrayAsync();
        Assert.StartsWith("%PDF-", Encoding.ASCII.GetString(pdf, 0, 5));
        Assert.Equal(2, CountPages(pdf));
    }

    [Fact]
    public async Task CreatePdf_WithOcrAndASuggestion_SendsTheSuggestedNamePercentEncoded()
    {
        using var factory = _factory.WithWebHostBuilder(builder => builder.ConfigureTestServices(services =>
        {
            services.AddSingleton<IOcrProvider>(new FakeOcr("FACTUUR Garage Peeters"));
            services.AddSingleton(new ClaudeOptions { ApiKey = "not-used" });
            services.AddSingleton<IDocumentTitleSuggester>(new FakeSuggester("Café Brouwer: Ré/Kost-20260914"));
        }));
        var email = await _factory.SeedAccountAsync(Password);
        var client = factory.CreateClient(new() { BaseAddress = new Uri("https://localhost"), HandleCookies = true });
        Assert.Equal(HttpStatusCode.OK, (await client.PostAsJsonAsync("/api/auth/login", new { email, password = Password })).StatusCode);

        var response = await client.PostAsync("/api/documents/pdf", Pages(TestImages.Png(60, 80)));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("true", Assert.Single(response.Headers.GetValues("X-Searchable")));
        // Characters a file system refuses are dropped, accents survive the encoding.
        var header = Assert.Single(response.Headers.GetValues("X-Suggested-Name"));
        Assert.Equal("Café Brouwer RéKost-20260914", Uri.UnescapeDataString(header));
        // The PDF itself still carries the name the client sent.
        Assert.Equal("Factuur oktober.pdf", response.Content.Headers.ContentDisposition?.FileNameStar);
    }

    [Fact]
    public async Task CreatePdf_WhenTheSuggestionFails_StillReturnsThePdf()
    {
        using var factory = _factory.WithWebHostBuilder(builder => builder.ConfigureTestServices(services =>
        {
            services.AddSingleton<IOcrProvider>(new FakeOcr("FACTUUR"));
            services.AddSingleton(new ClaudeOptions { ApiKey = "not-used" });
            services.AddSingleton<IDocumentTitleSuggester>(new FakeSuggester(null, fail: true));
        }));
        var email = await _factory.SeedAccountAsync(Password);
        var client = factory.CreateClient(new() { BaseAddress = new Uri("https://localhost"), HandleCookies = true });
        Assert.Equal(HttpStatusCode.OK, (await client.PostAsJsonAsync("/api/auth/login", new { email, password = Password })).StatusCode);

        var response = await client.PostAsync("/api/documents/pdf", Pages(TestImages.Png(60, 80)));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.False(response.Headers.Contains("X-Suggested-Name"));
    }

    private sealed class FakeOcr(string text) : IOcrProvider
    {
        public Task<OcrResult> MakeSearchableAsync(byte[] imagePdf, CancellationToken cancellationToken) =>
            Task.FromResult(new OcrResult(imagePdf, text));
    }

    private sealed class FakeSuggester(string? name, bool fail = false) : IDocumentTitleSuggester
    {
        public Task<string?> SuggestAsync(string documentText, CancellationToken cancellationToken) =>
            fail ? throw new HttpRequestException("Anthropic unreachable") : Task.FromResult(name);
    }

    [Fact]
    public async Task CreatePdf_RefusesAPartThatIsNotAnImage()
    {
        var client = await SignedInClientAsync();

        var response = await client.PostAsync("/api/documents/pdf", Pages(Encoding.UTF8.GetBytes("<html>not an image</html>")));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task CreatePdf_RequiresSignIn()
    {
        var client = _factory.CreateCookieClient();

        var response = await client.PostAsync("/api/documents/pdf", Pages(TestImages.Png(10, 10)));

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Email_WithoutAMailService_Answers503_AndCapabilitiesSaySo()
    {
        var client = await SignedInClientAsync();

        var capabilities = await client.GetFromJsonAsync<JsonElement>("/api/documents/capabilities");
        Assert.False(capabilities.GetProperty("email").GetBoolean());
        Assert.False(capabilities.GetProperty("searchablePdf").GetBoolean());

        var form = new MultipartFormDataContent
        {
            { new ByteArrayContent(Encoding.ASCII.GetBytes("%PDF-1.7")), "file", "x.pdf" },
            { new StringContent("boekhouding@example.com"), "recipient" },
        };
        var response = await client.PostAsync("/api/documents/email", form);

        Assert.Equal(HttpStatusCode.ServiceUnavailable, response.StatusCode);
    }

    // Counts "/Type /Page" objects (not "/Pages"); good enough for a PDF this code wrote itself.
    private static int CountPages(byte[] pdf)
    {
        var text = Encoding.Latin1.GetString(pdf);
        return System.Text.RegularExpressions.Regex.Matches(text, @"/Type\s*/Page(?!s)").Count;
    }
}
