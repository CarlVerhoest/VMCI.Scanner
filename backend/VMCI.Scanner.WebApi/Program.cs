using System.Text;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Http.Features;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Serilog;
using VMCI.Scanner.DB.Data;
using VMCI.Scanner.DB.UnitOfWork;
using VMCI.Scanner.WebApi.Configuration;
using VMCI.Scanner.WebApi.Middleware;
using VMCI.Scanner.WebApi.Services;

// The generic skeleton: login and nothing else. Integrations (document storage, mail, AI, ...) are
// added later, each registered ONLY when its configuration is complete, and each logging
// "skipped: not configured" otherwise - the app must always start without them.

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

                services.AddControllers()
                    .AddJsonOptions(options =>
                    {
                        options.JsonSerializerOptions.PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase;
                        options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter());
                    });
                services.AddOpenApi();

                // Configure multipart form options for file uploads
                services.Configure<FormOptions>(options =>
                {
                    options.MultipartBodyLengthLimit = 5242880; // 5 MB
                });

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

                // Configure JWT Authentication
                var jwtKey = config["Jwt:Key"];
                if (string.IsNullOrEmpty(jwtKey))
                {
                    throw new InvalidOperationException(
                        "JWT Key not configured. Set Jwt:Key in appsettings, backend/secrets/appsettings.secrets.json, " +
                        "user secrets or the Jwt__Key environment variable - see docs/security.md.");
                }
                var key = Encoding.UTF8.GetBytes(jwtKey);

                services.AddAuthentication(options =>
                {
                    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
                    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
                })
                .AddJwtBearer(options =>
                {
                    options.TokenValidationParameters = new TokenValidationParameters
                    {
                        ValidateIssuer = true,
                        ValidateAudience = true,
                        ValidateLifetime = true,
                        ValidateIssuerSigningKey = true,
                        ValidIssuer = config["Jwt:Issuer"],
                        ValidAudience = config["Jwt:Audience"],
                        IssuerSigningKey = new SymmetricSecurityKey(key),
                        ClockSkew = TimeSpan.FromMinutes(5)
                    };
                });

                services.AddAuthorization();

                // Register Repository pattern services
                services.AddScoped<IUnitOfWork, UnitOfWork>();

                // Register custom services
                services.AddScoped<ITokenService, TokenService>();
                services.AddScoped<IPasswordService, PasswordService>();

                // Configure CORS with specific origins for security
                services.AddCors(options =>
                {
                    options.AddPolicy("ScannerPolicy", policy =>
                    {
                        var allowedOrigins = new[] {
                            "http://localhost:3300",  // Vite dev server
                            "https://localhost:3300", // Vite dev server HTTPS
                        };

                        // Outside development, only allow the actual domain
                        if (!env.IsDevelopment())
                        {
                            allowedOrigins = new[] {
                                config["Frontend:BaseUrl"] ?? "https://localhost:7300"
                            };
                        }

                        policy.WithOrigins(allowedOrigins)
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

                app.UseAuthentication();
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

// Make Program class accessible for integration tests
public partial class Program { }
