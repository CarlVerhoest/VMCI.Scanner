namespace VMCI.Scanner.WebApi.DTOs;

// Response shape for GET api/info/environment - lets the frontend gate dev-only UI (e.g. a
// development-only reset button) without hardcoding a hostname/URL check. Anonymous per
// InfoController's rule, and correspondingly minimal: which ASPNETCORE_ENVIRONMENT name is
// running is no more sensitive than Version() already is.
public class EnvironmentDto
{
    public bool IsDevelopment { get; set; }
}
