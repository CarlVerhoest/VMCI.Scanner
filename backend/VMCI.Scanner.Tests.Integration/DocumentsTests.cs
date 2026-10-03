using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;

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
