using VMCI.Scanner.WebApi.Services;

namespace VMCI.Scanner.Tests.Unit.Services;

public class PasswordServiceTests
{
    private readonly PasswordService _service = new();

    [Fact]
    public void HashPassword_ThenVerifyPassword_RoundTrips()
    {
        var hash = _service.HashPassword("Fabricated-Passw0rd");

        Assert.NotEqual("Fabricated-Passw0rd", hash);
        Assert.True(_service.VerifyPassword("Fabricated-Passw0rd", hash));
    }

    [Fact]
    public void HashPassword_SamePasswordTwice_GivesDifferentHashes()
    {
        var first = _service.HashPassword("Fabricated-Passw0rd");
        var second = _service.HashPassword("Fabricated-Passw0rd");

        // BCrypt salts every hash, so equal passwords must not be recognisable from the stored value.
        Assert.NotEqual(first, second);
    }

    [Fact]
    public void VerifyPassword_WrongPassword_ReturnsFalse()
    {
        var hash = _service.HashPassword("Fabricated-Passw0rd");

        Assert.False(_service.VerifyPassword("Another-Passw0rd", hash));
    }

    [Fact]
    public void VerifyPassword_MalformedHash_ReturnsFalseInsteadOfThrowing()
    {
        Assert.False(_service.VerifyPassword("Fabricated-Passw0rd", "not-a-bcrypt-hash"));
    }

    [Theory]
    [InlineData("Abcdefg1", true)]
    [InlineData("Abcdef1", false)]    // 7 characters
    [InlineData("abcdefg1", false)]   // no uppercase
    [InlineData("ABCDEFG1", false)]   // no lowercase
    [InlineData("Abcdefgh", false)]   // no digit
    [InlineData("", false)]
    [InlineData(null, false)]
    public void IsValidPassword_AppliesTheLengthAndCharacterRules(string? password, bool expected)
    {
        Assert.Equal(expected, _service.IsValidPassword(password));
    }
}
