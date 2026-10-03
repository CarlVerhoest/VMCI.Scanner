using System.Net;
using System.Net.Http.Json;
using System.Text.Json;

namespace VMCI.Scanner.Tests.Integration;

// Every test seeds its own accounts, so they do not disturb each other.
[Collection(ApiCollection.Name)]
public class AuthFlowTests
{
    private const string Password = "Geheim123";
    private const string NewPassword = "Nieuw4567";

    private readonly ScannerWebApplicationFactory _factory;

    public AuthFlowTests(ScannerWebApplicationFactory factory)
    {
        _factory = factory;
    }

    private static Task<HttpResponseMessage> LoginAsync(HttpClient client, string email, string password) =>
        client.PostAsJsonAsync("/api/auth/login", new { email, password });

    private async Task<HttpClient> SignedInClientAsync(string email, string password = Password)
    {
        var client = _factory.CreateCookieClient();
        var response = await LoginAsync(client, email, password);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        return client;
    }

    [Fact]
    public async Task Login_SetsAPersistentHttpOnlySecureStrictCookie()
    {
        var email = await _factory.SeedAccountAsync(Password);
        var client = _factory.CreateCookieClient();

        var response = await LoginAsync(client, email, Password);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var setCookie = Assert.Single(response.Headers.GetValues("Set-Cookie"));
        Assert.StartsWith("scanner_auth=", setCookie);
        Assert.Contains("httponly", setCookie, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("secure", setCookie, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("samesite=strict", setCookie, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("expires=", setCookie, StringComparison.OrdinalIgnoreCase);

        var me = await client.GetFromJsonAsync<JsonElement>("/api/auth/me");
        Assert.Equal(email, me.GetProperty("email").GetString());
        Assert.False(me.GetProperty("mustChangePassword").GetBoolean());
    }

    [Theory]
    [InlineData(false, "wrong-password")]
    [InlineData(true, Password)]
    public async Task Login_WrongPasswordOrLockedAccount_GivesTheSameGeneric401(bool locked, string password)
    {
        var email = await _factory.SeedAccountAsync(Password, isLocked: locked);
        var client = _factory.CreateCookieClient();

        var response = await LoginAsync(client, email, password);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        Assert.Contains("Ongeldig e-mailadres of wachtwoord", await response.Content.ReadAsStringAsync());
    }

    [Fact]
    public async Task Logout_EndsTheSession()
    {
        var client = await SignedInClientAsync(await _factory.SeedAccountAsync(Password));

        Assert.Equal(HttpStatusCode.NoContent, (await client.PostAsync("/api/auth/logout", null)).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await client.GetAsync("/api/auth/me")).StatusCode);
    }

    [Fact]
    public async Task TemporaryPassword_BlocksEverythingButThePasswordChange_UntilChanged()
    {
        var email = await _factory.SeedAccountAsync(Password, mustChangePassword: true);
        var client = await SignedInClientAsync(email);

        var me = await client.GetFromJsonAsync<JsonElement>("/api/auth/me");
        Assert.True(me.GetProperty("mustChangePassword").GetBoolean());

        var blocked = await client.GetAsync("/api/recipients");
        Assert.Equal(HttpStatusCode.Forbidden, blocked.StatusCode);
        Assert.Contains("PASSWORD_CHANGE_REQUIRED", await blocked.Content.ReadAsStringAsync());

        var change = await client.PostAsJsonAsync("/api/account/me/change-password",
            new { currentPassword = Password, newPassword = NewPassword });
        Assert.Equal(HttpStatusCode.OK, change.StatusCode);

        // Same device keeps working, with the re-issued cookie.
        Assert.Equal(HttpStatusCode.OK, (await client.GetAsync("/api/recipients")).StatusCode);
        Assert.False((await _factory.GetAccountAsync(email)).MustChangePassword);
    }

    [Fact]
    public async Task ChangingThePassword_SignsOutOtherDevices()
    {
        var email = await _factory.SeedAccountAsync(Password);
        var phone = await SignedInClientAsync(email);
        var pc = await SignedInClientAsync(email);

        var change = await phone.PostAsJsonAsync("/api/account/me/change-password",
            new { currentPassword = Password, newPassword = NewPassword });
        Assert.Equal(HttpStatusCode.OK, change.StatusCode);

        Assert.Equal(HttpStatusCode.OK, (await phone.GetAsync("/api/auth/me")).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await pc.GetAsync("/api/auth/me")).StatusCode);
    }

    [Fact]
    public async Task LockingAnAccount_RejectsItsSignedInDevice_OnTheNextRequest()
    {
        var admin = await SignedInClientAsync(await _factory.SeedAccountAsync(Password, isAdmin: true));
        var email = await _factory.SeedAccountAsync(Password);
        var user = await SignedInClientAsync(email);
        Assert.Equal(HttpStatusCode.OK, (await user.GetAsync("/api/auth/me")).StatusCode);

        var id = (await _factory.GetAccountAsync(email)).Id;
        Assert.Equal(HttpStatusCode.OK, (await admin.PostAsync($"/api/admin/accounts/{id}/lock", null)).StatusCode);

        Assert.Equal(HttpStatusCode.Unauthorized, (await user.GetAsync("/api/auth/me")).StatusCode);
    }

    [Fact]
    public async Task AdminResetPassword_SignsTheUserOut_AndRequiresANewPassword()
    {
        var admin = await SignedInClientAsync(await _factory.SeedAccountAsync(Password, isAdmin: true));
        var email = await _factory.SeedAccountAsync(Password);
        var user = await SignedInClientAsync(email);
        var id = (await _factory.GetAccountAsync(email)).Id;

        var reset = await admin.PostAsJsonAsync($"/api/admin/accounts/{id}/reset-password", new { temporaryPassword = "welkom" });
        Assert.Equal(HttpStatusCode.OK, reset.StatusCode);

        Assert.Equal(HttpStatusCode.Unauthorized, (await user.GetAsync("/api/auth/me")).StatusCode);
        var again = await SignedInClientAsync(email, "welkom");
        var me = await again.GetFromJsonAsync<JsonElement>("/api/auth/me");
        Assert.True(me.GetProperty("mustChangePassword").GetBoolean());
    }

    [Fact]
    public async Task AdminCreatesAccount_WithASimpleTemporaryPassword()
    {
        var admin = await SignedInClientAsync(await _factory.SeedAccountAsync(Password, isAdmin: true));
        var email = $"nieuw-{Guid.NewGuid():N}@example.com";

        var create = await admin.PostAsJsonAsync("/api/admin/accounts", new
        {
            email,
            firstName = "Jan",
            surName = "Peeters",
            roleCode = "COWORKER",
            temporaryPassword = "jan1",
        });
        Assert.Equal(HttpStatusCode.Created, create.StatusCode);

        var duplicate = await admin.PostAsJsonAsync("/api/admin/accounts", new
        {
            email,
            firstName = "Jan",
            surName = "Peeters",
            roleCode = "COWORKER",
            temporaryPassword = "jan1",
        });
        Assert.Equal(HttpStatusCode.Conflict, duplicate.StatusCode);

        var user = await SignedInClientAsync(email, "jan1");
        var me = await user.GetFromJsonAsync<JsonElement>("/api/auth/me");
        Assert.True(me.GetProperty("mustChangePassword").GetBoolean());
    }

    [Fact]
    public async Task AdminCannotLockThemselves()
    {
        var email = await _factory.SeedAccountAsync(Password, isAdmin: true);
        var admin = await SignedInClientAsync(email);
        var id = (await _factory.GetAccountAsync(email)).Id;

        Assert.Equal(HttpStatusCode.BadRequest, (await admin.PostAsync($"/api/admin/accounts/{id}/lock", null)).StatusCode);
    }

    [Fact]
    public async Task AdminEndpoints_AreForbiddenToACoworker()
    {
        var user = await SignedInClientAsync(await _factory.SeedAccountAsync(Password));

        Assert.Equal(HttpStatusCode.Forbidden, (await user.GetAsync("/api/admin/accounts")).StatusCode);
    }

    [Fact]
    public async Task Recipients_UserAddsAndListsTheirOwn_AdminRemoves()
    {
        var email = await _factory.SeedAccountAsync(Password);
        var user = await SignedInClientAsync(email);
        var admin = await SignedInClientAsync(await _factory.SeedAccountAsync(Password, isAdmin: true));

        var invalid = await user.PostAsJsonAsync("/api/recipients", new { email = "geen adres" });
        Assert.Equal(HttpStatusCode.BadRequest, invalid.StatusCode);

        var added = await user.PostAsJsonAsync("/api/recipients", new { email = "boekhouding@example.com", label = "Boekhouding" });
        Assert.Equal(HttpStatusCode.OK, added.StatusCode);
        var recipientId = (await added.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetGuid();

        var list = await user.GetFromJsonAsync<JsonElement>("/api/recipients");
        Assert.Equal(1, list.GetArrayLength());

        var accountId = (await _factory.GetAccountAsync(email)).Id;
        var removed = await admin.DeleteAsync($"/api/admin/accounts/{accountId}/recipients/{recipientId}");
        Assert.Equal(HttpStatusCode.NoContent, removed.StatusCode);
        Assert.Equal(0, (await user.GetFromJsonAsync<JsonElement>("/api/recipients")).GetArrayLength());
    }

    [Fact]
    public async Task StateChangingRequest_FromAForeignOrigin_IsRefused()
    {
        var client = await SignedInClientAsync(await _factory.SeedAccountAsync(Password));

        using var request = new HttpRequestMessage(HttpMethod.Post, "/api/recipients")
        {
            Content = JsonContent.Create(new { email = "x@example.com" }),
        };
        request.Headers.Add("Origin", "https://evil.example");

        Assert.Equal(HttpStatusCode.Forbidden, (await client.SendAsync(request)).StatusCode);
    }
}
