using System.Net.Mail;
using VMCI.Scanner.DB.Models;
using VMCI.Scanner.DB.UnitOfWork;
using VMCI.Scanner.WebApi.DTOs;

namespace VMCI.Scanner.WebApi.Services;

public interface IRecipientService
{
    Task<List<RecipientDto>> GetAsync(Guid accountId);

    /// <summary>
    /// Adds an address to an account's list. Returns the existing entry when the address is already
    /// there, or null with <paramref name="error"/> set (Dutch, shown to the user) when it is invalid.
    /// </summary>
    Task<(RecipientDto? Recipient, string? Error)> AddAsync(Guid accountId, AddRecipientRequest request);
}

/// <summary>
/// The fixed addresses a user may mail a PDF to. The server only ever mails to an address on the
/// account's list, so adding one is an explicit, logged step. Only an administrator removes one.
/// </summary>
public class RecipientService : IRecipientService
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly ILogger<RecipientService> _logger;

    public RecipientService(IUnitOfWork unitOfWork, ILogger<RecipientService> logger)
    {
        _unitOfWork = unitOfWork;
        _logger = logger;
    }

    public async Task<List<RecipientDto>> GetAsync(Guid accountId)
    {
        var recipients = await _unitOfWork.Recipient.GetByAccountAsync(accountId);
        return recipients.Select(ToDto).ToList();
    }

    public async Task<(RecipientDto? Recipient, string? Error)> AddAsync(Guid accountId, AddRecipientRequest request)
    {
        var email = NormalizeEmail(request.Email);
        if (email == null)
        {
            return (null, "Dit is geen geldig e-mailadres.");
        }

        var existing = await _unitOfWork.Recipient.GetByAccountAndEmailAsync(accountId, email);
        if (existing != null)
        {
            return (ToDto(existing), null);
        }

        var label = string.IsNullOrWhiteSpace(request.Label) ? null : request.Label.Trim();
        var recipient = new Recipient
        {
            Id = Guid.NewGuid(),
            AccountId = accountId,
            Email = email,
            Label = label,
            CreatedAt = DateTime.UtcNow,
        };
        _unitOfWork.Recipient.Add(recipient);
        await _unitOfWork.SaveChangesAsync();

        _logger.LogInformation("Recipient {Email} added to account {AccountId}", email, accountId);
        return (ToDto(recipient), null);
    }

    /// <summary>
    /// One plain address: "name@domain.tld", no display name, no list, a dot in the domain.
    /// Returns the trimmed address, or null when it is not one.
    /// </summary>
    public static string? NormalizeEmail(string? input)
    {
        var email = input?.Trim();
        if (string.IsNullOrEmpty(email) || email.Length > 256)
        {
            return null;
        }

        if (!MailAddress.TryCreate(email, out var parsed) ||
            !string.Equals(parsed.Address, email, StringComparison.Ordinal) ||
            !string.IsNullOrEmpty(parsed.DisplayName))
        {
            return null;
        }

        var domain = parsed.Host;
        if (!domain.Contains('.') || domain.StartsWith('.') || domain.EndsWith('.'))
        {
            return null;
        }

        return email;
    }

    public static RecipientDto ToDto(Recipient recipient) => new()
    {
        Id = recipient.Id,
        Email = recipient.Email,
        Label = recipient.Label,
    };
}
