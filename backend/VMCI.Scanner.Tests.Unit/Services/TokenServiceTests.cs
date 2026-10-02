using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using Microsoft.Extensions.Configuration;
using VMCI.Scanner.WebApi.Services;

namespace VMCI.Scanner.Tests.Unit.Services;

public class TokenServiceTests
{
    // Test-only keys, used nowhere else.
    private const string TestKey = "unit-test-key-0123456789-abcdefghijklmnopqrstuvwxyz";
    private const string OtherKey = "another-test-key-9876543210-zyxwvutsrqponmlkjihgfedcba";

    private static TokenService CreateService(string key = TestKey, string expirationHours = "24")
    {
        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Jwt:Key"] = key,
                ["Jwt:Issuer"] = "Scanner",
                ["Jwt:Audience"] = "Scanner",
                ["Jwt:ExpirationHours"] = expirationHours,
            })
            .Build();

        return new TokenService(configuration);
    }

    private static JwtSecurityToken Read(string token) => new JwtSecurityTokenHandler().ReadJwtToken(token);

    [Fact]
    public void Constructor_WithoutKey_Throws()
    {
        var configuration = new ConfigurationBuilder().Build();

        Assert.Throws<InvalidOperationException>(() => new TokenService(configuration));
    }

    [Fact]
    public void GenerateToken_CarriesAccountIdUsernameIssuerAndAudience()
    {
        var accountId = Guid.NewGuid();

        var jwt = Read(CreateService().GenerateToken(accountId, "user@example.com"));

        Assert.Equal(accountId.ToString(), jwt.Claims.Single(c => c.Type == JwtRegisteredClaimNames.NameId).Value);
        Assert.Equal("user@example.com", jwt.Claims.Single(c => c.Type == JwtRegisteredClaimNames.UniqueName).Value);
        Assert.Contains(jwt.Claims, c => c.Type == JwtRegisteredClaimNames.Jti);
        Assert.Contains(jwt.Claims, c => c.Type == JwtRegisteredClaimNames.Iat);
        Assert.Equal("Scanner", jwt.Issuer);
        Assert.Contains("Scanner", jwt.Audiences);
    }

    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public void GenerateToken_CarriesTheIsAdminClaim(bool isAdmin)
    {
        var service = CreateService();

        var token = service.GenerateToken(
            Guid.NewGuid(),
            "user@example.com",
            new[] { new Claim("IsAdmin", isAdmin.ToString()) });

        Assert.Equal(isAdmin.ToString(), Read(token).Claims.Single(c => c.Type == "IsAdmin").Value);

        // And it survives validation, which is what the API's [Authorize] pipeline sees.
        var principal = service.GetTokenClaims(token);
        Assert.NotNull(principal);
        Assert.Equal(isAdmin.ToString(), principal.FindFirst("IsAdmin")?.Value);
    }

    [Theory]
    [InlineData("1")]
    [InlineData("24")]
    [InlineData("72")]
    public void GenerateToken_HonoursTheConfiguredExpiry(string expirationHours)
    {
        var before = DateTime.UtcNow;

        var jwt = Read(CreateService(expirationHours: expirationHours).GenerateToken(Guid.NewGuid(), "user@example.com"));

        var expected = before.AddHours(int.Parse(expirationHours));
        Assert.InRange(jwt.ValidTo, expected.AddMinutes(-1), expected.AddMinutes(1));
    }

    [Fact]
    public void ValidateToken_OwnToken_IsValid()
    {
        var service = CreateService();

        Assert.True(service.ValidateToken(service.GenerateToken(Guid.NewGuid(), "user@example.com")));
    }

    [Fact]
    public void ValidateToken_TokenSignedWithAnotherKey_IsRejected()
    {
        var token = CreateService(OtherKey).GenerateToken(Guid.NewGuid(), "user@example.com");

        var service = CreateService();
        Assert.False(service.ValidateToken(token));
        Assert.Null(service.GetTokenClaims(token));
    }

    [Fact]
    public void ValidateToken_Garbage_IsRejected()
    {
        Assert.False(CreateService().ValidateToken("not-a-token"));
    }
}
