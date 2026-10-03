namespace VMCI.Scanner.Tests.Integration;

/// <summary>
/// Every test class shares ONE factory: Program.cs freezes a Serilog bootstrap logger, which can be
/// done once per process, so a second host would fail to start. Tests seed their own accounts with
/// unique emails, so sharing the in-memory database is safe.
/// </summary>
[CollectionDefinition(Name)]
public class ApiCollection : ICollectionFixture<ScannerWebApplicationFactory>
{
    public const string Name = "Api";
}
