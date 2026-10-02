using VMCI.Scanner.WebApi.DTOs;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace VMCI.Scanner.WebApi.Controllers;

// 🚨 The rule for this controller: an endpoint is EITHER anonymous and contentless, OR
// JWT-protected and detailed. Never both.
//
// Anonymous endpoints here are reachable from a monitoring probe with no credentials, so they
// return booleans, counts and version strings - and nothing else. No exception types, no
// messages, no error bodies of external services, no inner-exception chains. Every failure is
// logged server-side at Warning with the full exception; the application log is where a red
// result gets diagnosed.
//
// When adding an endpoint here, pick a side. Do not put diagnostic detail behind [AllowAnonymous]
// because it is convenient while debugging.
[ApiController]
[Route("api/[controller]")]
public class InfoController : ControllerBase
{
    private readonly IWebHostEnvironment _env;

    public InfoController(IWebHostEnvironment env)
    {
        _env = env;
    }

    [HttpGet("version")]
    [AllowAnonymous]
    public ActionResult<string> Version()
    {
        return Ok(ServiceContext.Version);
    }

    // Lets the frontend gate dev-only UI on the backend's real ASPNETCORE_ENVIRONMENT rather than
    // guessing from the hostname/URL - a frontend build is not itself a trust boundary, so this is
    // purely to decide what to show; any destructive endpoint it gates re-checks IsDevelopment()
    // itself server-side regardless.
    [HttpGet("environment")]
    [AllowAnonymous]
    public ActionResult<EnvironmentDto> Environment()
    {
        return Ok(new EnvironmentDto { IsDevelopment = _env.IsDevelopment() });
    }
}
