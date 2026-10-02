using System.Security.Claims;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using VMCI.Scanner.WebApi.Extensions;

namespace VMCI.Scanner.Tests.Unit.Extensions;

public class ControllerExtensionsTests
{
    private sealed class TestController : ControllerBase;

    // A controller whose User is a hand-built principal carrying exactly the given claims.
    private static ControllerBase ControllerWith(params Claim[] claims)
    {
        return new TestController
        {
            ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext
                {
                    User = new ClaimsPrincipal(new ClaimsIdentity(claims, authenticationType: "Test")),
                },
            },
        };
    }

    [Theory]
    [InlineData("nameid")]
    [InlineData("sub")]
    [InlineData(ClaimTypes.NameIdentifier)]
    public void GetCurrentAccountId_ReadsTheIdFromEachSupportedClaim(string claimType)
    {
        var accountId = Guid.NewGuid();

        var controller = ControllerWith(new Claim(claimType, accountId.ToString()));

        Assert.Equal(accountId, controller.GetCurrentAccountId());
    }

    [Fact]
    public void GetCurrentAccountId_WithoutAnIdClaim_ReturnsNull()
    {
        Assert.Null(ControllerWith().GetCurrentAccountId());
    }

    [Fact]
    public void GetCurrentAccountId_WhenTheClaimIsNotAGuid_ReturnsNull()
    {
        Assert.Null(ControllerWith(new Claim("nameid", "42")).GetCurrentAccountId());
    }

    [Theory]
    [InlineData("unique_name")]
    [InlineData(ClaimTypes.Name)]
    public void GetCurrentUsername_ReadsTheNameFromEachSupportedClaim(string claimType)
    {
        var controller = ControllerWith(new Claim(claimType, "user@example.com"));

        Assert.Equal("user@example.com", controller.GetCurrentUsername());
    }

    [Fact]
    public void GetCurrentUsername_WithoutANameClaim_Throws()
    {
        Assert.Throws<UnauthorizedAccessException>(() => ControllerWith().GetCurrentUsername());
    }

    [Theory]
    [InlineData("True", true)]
    [InlineData("true", true)]
    [InlineData("False", false)]
    [InlineData("yes", false)]
    public void IsCurrentUserAdmin_ParsesTheIsAdminClaim(string claimValue, bool expected)
    {
        var controller = ControllerWith(new Claim("IsAdmin", claimValue));

        Assert.Equal(expected, controller.IsCurrentUserAdmin());
    }

    [Fact]
    public void IsCurrentUserAdmin_WithoutTheClaim_IsFalse()
    {
        Assert.False(ControllerWith().IsCurrentUserAdmin());
    }
}
