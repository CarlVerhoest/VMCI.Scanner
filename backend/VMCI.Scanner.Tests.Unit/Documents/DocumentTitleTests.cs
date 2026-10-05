using VMCI.Scanner.Claude;

namespace VMCI.Scanner.Tests.Unit.Documents;

public class DocumentTitleTests
{
    [Fact]
    public void Compose_Invoice_IsCompanyNatureAndCompactDate()
    {
        var facts = new DocumentFacts(true, "Garage Peeters BV", "Onderhoud wagen", "2026-09-14", "");

        Assert.Equal("Garage Peeters BV-Onderhoud wagen-20260914", DocumentTitle.Compose(facts));
    }

    [Fact]
    public void Compose_InvoiceWithoutReadableDate_KeepsCompanyAndNature()
    {
        var facts = new DocumentFacts(true, "Garage Peeters BV", "Onderhoud", "14/09/2026", "");

        Assert.Equal("Garage Peeters BV-Onderhoud", DocumentTitle.Compose(facts));
    }

    [Fact]
    public void Compose_LongCompanyName_IsNeverShortened()
    {
        var company = "Algemene Onderneming voor Bouw- en Renovatiewerken Van den Broeck en Zonen NV";
        var facts = new DocumentFacts(true, company, "Renovatie", "2026-01-02", "");

        Assert.Equal($"{company}-Renovatie-20260102", DocumentTitle.Compose(facts));
    }

    [Fact]
    public void Compose_OtherDocument_UsesTheFreeTitle()
    {
        var facts = new DocumentFacts(false, "", "", "", "Verslag  vergadering\nraad van bestuur");

        Assert.Equal("Verslag vergadering raad van bestuur", DocumentTitle.Compose(facts));
    }

    [Fact]
    public void Compose_NothingUsable_IsNull()
    {
        Assert.Null(DocumentTitle.Compose(new DocumentFacts(false, "", "", "", "  ")));
        Assert.Null(DocumentTitle.Compose(new DocumentFacts(true, "", "", "", "")));
    }
}
