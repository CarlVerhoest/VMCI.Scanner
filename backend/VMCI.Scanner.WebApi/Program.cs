using System.Text.Json.Serialization;
using System.Threading.RateLimiting;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.Http.Features;
using Microsoft.AspNetCore.Server.Kestrel.Core;
using Microsoft.EntityFrameworkCore;
using Serilog;
using VMCI.Scanner.DB.Data;
using VMCI.Scanner.DB.UnitOfWork;
using VMCI.Scanner.Pdf;
using VMCI.Scanner.WebApi.Auth;
using VMCI.Scanner.WebApi.Configuration;
using VMCI.Scanner.WebApi.Controllers;
using VMCI.Scanner.WebApi.DTOs;
using VMCI.Scanner.WebApi.Middleware;
using VMCI.Scanner.WebApi.Services;

// Cookie login, account administration, and PDFs from scanned pages. Integrations (OCR, mail) are
// each registered ONLY when their configuration is complete, and each logs "skipped: not configured"
// otherwise - the app must always start without them.

// Configure Serilog early to capture startup errors
Log.Logger = new LoggerConfiguration()
    .WriteTo.Console()
    .CreateBootstrapLogger();

Log.Information("Starting Scanner service");

try
{
    CreateHostBuilder(args).Build().Run();
}
catch (Exception ex)
{
    Log.Fatal(ex, "Application terminated unexpectedly");
}
finally
{
    Log.CloseAndFlush();
}

static IHostBuilder CreateHostBuilder(string[] args) =>
    Host.CreateDefaultBuilder(args)
        .UseSerilog((context, services, configuration) => configuration
            .ReadFrom.Configuration(context.Configuration)
            .ReadFrom.Services(services)
            .Enrich.FromLogContext()
            .Enrich.WithProperty("Application", "scanner"))
        .ConfigureAppConfiguration((context, builder) =>
        {
            // Keys that must stay out of git live in backend/secrets/ (gitignored). Loaded after the
            // appsettings files, before user secrets and environment variables.
            var secretsLoaded = builder.AddSecretsFile(context.HostingEnvironment.ContentRootPath);
            Log.Information("Secrets file ../secrets/{File} {Result}.", SecretsFile.FileName,
                secretsLoaded ? "loaded" : "not present");
        })
        .ConfigureWebHostDefaults(webBuilder =>
        {
            webBuilder.ConfigureServices((hostContext, services) =>
            {
                var env = hostContext.HostingEnvironment;
                var config = hostContext.Configuration;

                // Configure Web Root Path for static files (the built SPA is copied into wwwroot)
                var staticFilesPath = config.GetValue<string>("StaticFiles:Path", "wwwroot");
                var webRootPath = Path.Combine(Directory.GetCurrentDirectory(), staticFilesPath ?? "wwwroot");
                var staticFilesEnabled = config.GetValue<bool>("StaticFiles:Enabled", true);
                if (staticFilesEnabled && !Directory.Exists(webRootPath))
                {
                    Directory.CreateDirectory(webRootPath);
                }

                services.AddControllers(options => options.Filters.Add<PasswordChangeRequiredFilter>())
                    .AddJsonOptions(options =>
                    {
                        options.JsonSerializerOptions.PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase;
                        options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter());
                    });
                services.AddOpenApi();

                // Configure Database - skip entirely for the Testing environment (integration tests)
                if (!hostContext.HostingEnvironment.IsEnvironment("Testing"))
                {
                    var connectionString = config.GetConnectionString("DefaultConnection");
                    if (!string.IsNullOrEmpty(connectionString))
                    {
                        services.AddDbContext<ScannerContext>(options =>
                            options.UseSqlServer(connectionString));
                    }
                    else
                    {
                        // ScannerContext is deliberately NOT registered when unconfigured. Any
                        // controller that depends on IUnitOfWork then fails DI activation with an opaque
                        // "Unable to resolve service for type 'ScannerContext'" 500 before the action
                        // body ever runs. Almost always ASPNETCORE_ENVIRONMENT is not "Development" for
                        // the running process, so appsettings.Development.json never layered over the
                        // empty placeholder. Log loudly at startup instead of only on first request.
                        Log.Warning(
                            "Database not configured: ConnectionStrings:DefaultConnection is empty " +
                            "for environment '{Environment}'. ScannerContext will NOT be registered, " +
                            "so any endpoint using IUnitOfWork will 500 on the first request. " +
                            "For local development make sure ASPNETCORE_ENVIRONMENT=Development is set " +
                            "(dotnet run picks it up from Properties/launchSettings.json; running the DLL directly does not).",
                            hostContext.HostingEnvironment.EnvironmentName);
                    }
                }

                // Data Protection encrypts the login cookie. Its keys MUST survive restarts and
                // deployments, or every restart signs out every device. They live next to the secrets
                // (outside the published folder, outside git); the Testing environment keeps them in memory.
                var dataProtection = services.AddDataProtection().SetApplicationName("VMCI.Scanner");
                if (!env.IsEnvironment("Testing"))
                {
                    var keysPath = config["DataProtection:KeysPath"];
                    if (string.IsNullOrWhiteSpace(keysPath))
                    {
                        keysPath = Path.Combine(env.ContentRootPath, "..", "secrets", "data-protection-keys");
                    }
                    var keysDirectory = new DirectoryInfo(Path.GetFullPath(keysPath));
                    dataProtection.PersistKeysToFileSystem(keysDirectory);
                    Log.Information("Data Protection keys in {KeysPath}", keysDirectory.FullName);
                }

                // Cookie login (docs/security.md): persistent and sliding, about 400 days - the most
                // browsers accept - so an active user effectively never signs in again. Every request
                // re-checks the account in the database (AccountSessionValidator).
                services.AddAuthentication(CookieAuthenticationDefaults.AuthenticationScheme)
                    .AddCookie(options =>
                    {
                        options.Cookie.Name = "scanner_auth";
                        options.Cookie.HttpOnly = true;
                        options.Cookie.SecurePolicy = CookieSecurePolicy.Always;
                        options.Cookie.SameSite = SameSiteMode.Strict;
                        options.ExpireTimeSpan = TimeSpan.FromDays(400);
                        options.SlidingExpiration = true;
                        options.Events = new CookieAuthenticationEvents
                        {
                            OnValidatePrincipal = AccountSessionValidator.ValidateAsync,
                            // An API never redirects to a login page: 401 and 403, the client decides.
                            OnRedirectToLogin = context =>
                            {
                                context.Response.StatusCode = StatusCodes.Status401Unauthorized;
                                return Task.CompletedTask;
                            },
                            OnRedirectToAccessDenied = context =>
                            {
                                context.Response.StatusCode = StatusCodes.Status403Forbidden;
                                return Task.CompletedTask;
                            },
                        };
                    });

                services.AddAuthorization(options =>
                {
                    options.AddPolicy(ScannerClaims.AdminPolicy, policy => policy
                        .RequireAuthenticatedUser()
                        .RequireClaim(ScannerClaims.IsAdmin, bool.TrueString));
                });

                // Password guessing: a fixed number of login attempts per IP address per 15 minutes.
                var loginAttempts = config.GetValue("Limits:LoginAttemptsPer15Minutes", 10);
                services.AddRateLimiter(options =>
                {
                    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
                    options.OnRejected = async (context, cancellationToken) =>
                    {
                        await context.HttpContext.Response.WriteAsJsonAsync(
                            new { message = "Te veel aanmeldpogingen. Probeer het over een kwartier opnieuw." },
                            cancellationToken);
                    };
                    options.AddPolicy(AuthController.LoginRateLimitPolicy, httpContext =>
                        RateLimitPartition.GetFixedWindowLimiter(
                            httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown",
                            _ => new FixedWindowRateLimiterOptions
                            {
                                PermitLimit = loginAttempts,
                                Window = TimeSpan.FromMinutes(15),
                                QueueLimit = 0,
                            }));
                });

                // Register Repository pattern services
                services.AddScoped<IUnitOfWork, UnitOfWork>();

                // Register custom services
                services.AddScoped<IPasswordService, PasswordService>();
                services.AddScoped<IRecipientService, RecipientService>();

                services.Configure<DocumentLimitsOptions>(config.GetSection(DocumentLimitsOptions.SectionName));
                services.Configure<EmailOptions>(config.GetSection(EmailOptions.SectionName));
                var limits = config.GetSection(DocumentLimitsOptions.SectionName).Get<DocumentLimitsOptions>()
                    ?? new DocumentLimitsOptions();
                services.Configure<FormOptions>(options => options.MultipartBodyLengthLimit = limits.MaxRequestBytes);
                services.Configure<KestrelServerOptions>(kestrel => kestrel.Limits.MaxRequestBodySize = limits.MaxRequestBytes);
                // IIS (in-process) has its own limit; web.config's maxAllowedContentLength must allow it too.
                services.Configure<IISServerOptions>(iis => iis.MaxRequestBodySize = limits.MaxRequestBytes);

                // OCR is optional: without it PDFs are image-only and the client warns.
                var documentIntelligence = config.GetSection(DocumentIntelligenceOptions.SectionName)
                    .Get<DocumentIntelligenceOptions>() ?? new DocumentIntelligenceOptions();
                if (documentIntelligence.IsComplete)
                {
                    services.AddSingleton(documentIntelligence);
                    services.AddSingleton<IOcrProvider, AzureDocumentIntelligenceOcrProvider>();
                    Log.Information("Document Intelligence registered ({Endpoint}, model {ModelId})",
                        documentIntelligence.Endpoint, documentIntelligence.ModelId);
                }
                else
                {
                    Log.Information("Document Intelligence skipped: DocumentIntelligence:Endpoint/Key not configured");
                }
                services.AddScoped<SearchablePdfService>();

                // No mail service yet (postponed): IEmailSender is not registered, so mailing answers 503.
                Log.Information("Email skipped: no mail service chosen yet");

                // Configure CORS with specific origins for security
                services.AddCors(options =>
                {
                    options.AddPolicy("ScannerPolicy", policy =>
                    {
                        policy.WithOrigins(AllowedOrigins(env, config))
                              .AllowAnyMethod()
                              .AllowAnyHeader()
                              .AllowCredentials();
                    });
                });
            });

            webBuilder.Configure((context, app) =>
            {
                var env = context.HostingEnvironment;

                // First in the pipeline: stamps the arrival time on HttpContext.
                app.UseRequestTiming();

                if (env.IsDevelopment())
                {
                    app.UseDeveloperExceptionPage();
                }

                app.UseHttpsRedirection();

                // Static files for SPA hosting
                app.UseStaticFiles();

                app.UseRouting();

                app.UseCors("ScannerPolicy");
                app.UseOriginCheck(AllowedOrigins(env, context.Configuration));

                app.UseAuthentication();
                app.UseRateLimiter();
                app.UseAuthorization();

                // API controllers; every controller uses [Route("api/[controller]")]
                app.UseEndpoints(endpoints =>
                {
                    endpoints.MapControllers();

                    if (env.IsDevelopment())
                    {
                        endpoints.MapOpenApi();
                    }
                });

                // SPA fallback routing - serve index.html for non-API routes
                app.UseEndpoints(endpoints =>
                {
                    endpoints.MapFallback(fallbackContext =>
                    {
                        var path = fallbackContext.Request.Path.Value;
                        if (path != null && path.StartsWith("/api"))
                        {
                            fallbackContext.Response.StatusCode = StatusCodes.Status404NotFound;
                            return Task.CompletedTask;
                        }

                        fallbackContext.Response.ContentType = "text/html";
                        return fallbackContext.Response.SendFileAsync(Path.Combine(env.WebRootPath, "index.html"));
                    });
                });

                Log.Information("Scanner service configured successfully");
            });
        });

// The origins besides the site itself that may call the API: the Vite dev server in Development,
// otherwise only Frontend:BaseUrl.
static string[] AllowedOrigins(IWebHostEnvironment env, IConfiguration config) =>
    env.IsDevelopment()
        ? ["http://localhost:3300", "https://localhost:3300"]
        : [config["Frontend:BaseUrl"] is { Length: > 0 } baseUrl ? baseUrl : "https://localhost:7300"];

// Make Program class accessible for integration tests
public partial class Program { }
