using System.Net;
using Microsoft.AspNetCore.Mvc.Testing;

namespace VMCI.Scanner.Tests.Integration;

[Collection(ApiCollection.Name)]
public class ApiPipelineTests
{
    private readonly HttpClient _client;

    public ApiPipelineTests(ScannerWebApplicationFactory factory)
    {
        _client = factory.CreateClient(new WebApplicationFactoryClientOptions
        {
            AllowAutoRedirect = false,
        });
    }

    [Fact]
    public async Task GetVersion_Anonymous_Returns200()
    {
        var response = await _client.GetAsync("/api/info/version");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.False(string.IsNullOrWhiteSpace(await response.Content.ReadAsStringAsync()));
    }

    [Fact]
    public async Task GetAccountMe_WithoutCookie_Returns401_NotARedirect()
    {
        var response = await _client.GetAsync("/api/account/me");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task UnknownApiPath_Returns404_AndIsNotSwallowedByTheSpaFallback()
    {
        var response = await _client.GetAsync("/api/does-not-exist");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        // The SPA fallback answers text/html with index.html; an unknown API path must not.
        Assert.NotEqual("text/html", response.Content.Headers.ContentType?.MediaType);
    }
}
