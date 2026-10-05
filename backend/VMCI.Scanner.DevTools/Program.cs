namespace VMCI.Scanner.DevTools;

// Console app for one-off admin/dev tasks. One command per class; dispatch on the first argument.
// An explicit Main in a namespace rather than top-level statements: this project references the API,
// whose own top-level Program would otherwise collide with a second global Program class.
public static class Program
{
    public static async Task<int> Main(string[] args)
    {
        if (args.Length == 0 || args[0] is "-h" or "--help" or "help")
        {
            PrintUsage();
            return args.Length == 0 ? 2 : 0;
        }

        switch (args[0].ToLowerInvariant())
        {
            case "create-account":
                return await CreateAccountCommand.RunAsync(args[1..]);

            case "send-test-mail":
                return await SendTestMailCommand.RunAsync(args[1..]);

            default:
                Console.Error.WriteLine($"Unknown command '{args[0]}'.");
                PrintUsage();
                return 2;
        }
    }

    private static void PrintUsage()
    {
        Console.WriteLine("VMCI.Scanner.DevTools - one-off admin/dev tasks");
        Console.WriteLine();
        Console.WriteLine("Commands:");
        Console.WriteLine("  " + CreateAccountCommand.Usage);
        Console.WriteLine("  " + SendTestMailCommand.Usage);
    }
}
