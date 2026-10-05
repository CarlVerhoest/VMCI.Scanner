namespace VMCI.Scanner.Claude;

/// <summary>
/// Configuration section "Anthropic". ApiKey is a secret: backend/secrets/appsettings.secrets.json or
/// <c>Anthropic__ApiKey</c>, never a committed file. Scanner has its own key, not another application's,
/// so its cost shows separately in the Anthropic Console and it can be revoked on its own.
/// </summary>
public sealed class ClaudeOptions
{
    public const string SectionName = "Anthropic";

    public string ApiKey { get; set; } = string.Empty;

    public string TitleModel { get; set; } = "claude-opus-5-5";

    /// <summary>How long the PDF request may wait for a title before it goes out without one.</summary>
    public int TitleTimeoutSeconds { get; set; } = 20;

    public bool IsConfigured => !string.IsNullOrWhiteSpace(ApiKey);
}
