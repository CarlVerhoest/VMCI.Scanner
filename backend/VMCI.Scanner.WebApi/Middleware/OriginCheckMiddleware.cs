namespace VMCI.Scanner.WebApi.Middleware;

/// <summary>
/// CSRF defence in depth for the cookie login. The cookie is SameSite=Strict, so a browser does not
/// send it on a cross-site request; this additionally refuses any state-changing API request whose
/// Origin header names a site other than this one or an allowed development origin.
///
/// A request without an Origin header passes: browsers always send one on a cross-origin POST, so
/// its absence means a same-origin navigation or a non-browser client, neither of which is CSRF.
/// </summary>
public class OriginCheckMiddleware
{
    private static readonly HashSet<string> SafeMethods =
        new(StringComparer.OrdinalIgnoreCase) { "GET", "HEAD", "OPTIONS", "TRACE" };

    private readonly RequestDelegate _next;
    private readonly HashSet<string> _allowedOrigins;

    public OriginCheckMiddleware(RequestDelegate next, IEnumerable<string> allowedOrigins)
    {
        _next = next;
        _allowedOrigins = new HashSet<string>(
            allowedOrigins.Select(o => o.TrimEnd('/')), StringComparer.OrdinalIgnoreCase);
    }

    public async Task InvokeAsync(HttpContext context)
    {
        var request = context.Request;
        if (!SafeMethods.Contains(request.Method) &&
            request.Path.StartsWithSegments("/api") &&
            request.Headers.Origin.FirstOrDefault() is { Length: > 0 } origin)
        {
            var self = $"{request.Scheme}://{request.Host}";
            if (!string.Equals(origin, self, StringComparison.OrdinalIgnoreCase) &&
                !_allowedOrigins.Contains(origin))
            {
                context.Response.StatusCode = StatusCodes.Status403Forbidden;
                return;
            }
        }

        await _next(context);
    }
}

public static class OriginCheckMiddlewareExtensions
{
    public static IApplicationBuilder UseOriginCheck(this IApplicationBuilder app, IEnumerable<string> allowedOrigins)
    {
        return app.UseMiddleware<OriginCheckMiddleware>(allowedOrigins);
    }
}
