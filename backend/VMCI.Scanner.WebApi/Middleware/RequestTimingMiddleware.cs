using System.Diagnostics;

namespace VMCI.Scanner.WebApi.Middleware;

/// <summary>
/// Stamps every request with the moment it arrived, so an action can report how much of its own
/// elapsed time was spent before its first line ran.
///
/// That gap matters on upload endpoints: a multipart body is read during model binding - after
/// routing and authentication, before the action. Without this stamp a slow upload is
/// indistinguishable from slow server work.
/// </summary>
public sealed class RequestTimingMiddleware(RequestDelegate next)
{
    private const string StartTimestampKey = "Scanner.RequestStartTimestamp";

    public Task InvokeAsync(HttpContext context)
    {
        context.Items[StartTimestampKey] = Stopwatch.GetTimestamp();

        return next(context);
    }

    /// <summary>
    /// Milliseconds since this request arrived, or null when the middleware is not in the pipeline
    /// (which is what a unit test constructing a controller directly looks like).
    /// </summary>
    public static double? ElapsedMs(HttpContext context)
        => context.Items.TryGetValue(StartTimestampKey, out var stamp) && stamp is long start
            ? Stopwatch.GetElapsedTime(start).TotalMilliseconds
            : null;
}

public static class RequestTimingMiddlewareExtensions
{
    /// <summary>Register first, ahead of everything the timing is meant to include.</summary>
    public static IApplicationBuilder UseRequestTiming(this IApplicationBuilder app)
        => app.UseMiddleware<RequestTimingMiddleware>();
}
