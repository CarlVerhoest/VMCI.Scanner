using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using VMCI.Scanner.WebApi.DTOs;
using VMCI.Scanner.WebApi.Extensions;
using VMCI.Scanner.WebApi.Services;

namespace VMCI.Scanner.WebApi.Controllers;

/// <summary>The signed-in user's own recipients. Removing one is for an administrator only.</summary>
[ApiController]
[Route("api/[controller]")]
[Authorize]
public class RecipientsController : ControllerBase
{
    private readonly IRecipientService _recipients;

    public RecipientsController(IRecipientService recipients)
    {
        _recipients = recipients;
    }

    [HttpGet]
    public async Task<ActionResult<List<RecipientDto>>> Get()
    {
        var accountId = this.GetCurrentAccountId();
        if (accountId == null)
        {
            return Unauthorized();
        }

        return Ok(await _recipients.GetAsync(accountId.Value));
    }

    [HttpPost]
    public async Task<ActionResult<RecipientDto>> Add([FromBody] AddRecipientRequest request)
    {
        if (!ModelState.IsValid)
        {
            return ValidationProblem(ModelState);
        }

        var accountId = this.GetCurrentAccountId();
        if (accountId == null)
        {
            return Unauthorized();
        }

        var (recipient, error) = await _recipients.AddAsync(accountId.Value, request);
        if (recipient == null)
        {
            return BadRequest(new { message = error });
        }

        return Ok(recipient);
    }
}
