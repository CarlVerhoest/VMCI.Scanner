using VMCI.Scanner.Claude;

namespace VMCI.Scanner.Tests.Unit.Documents;

public class DocumentTitleTests
{
    [Fact]
    public void Compose_Invoice_IsCompanyNatureAndCompactDate()
    {
        var facts = new DocumentFacts(true, "Garage Peeters BV", "Onderhoud wagen", "2026-09-14", "");

        Assert.Equal("Garage Peeters-Onderhoud wagen-20260914", DocumentTitle.Compose(facts));
    }

    [Theory]
    [InlineData("Belcom Telecom NV", "Belcom Telecom")]
    [InlineData("Garage Peeters bv", "Garage Peeters")]
    [InlineData("Imprimerie Dupont S.A.", "Imprimerie Dupont")]
    [InlineData("Bakkerij Janssens, BVBA", "Bakkerij Janssens")]
    [InlineData("TotalEnergies", "TotalEnergies")]
    [InlineData("NVidia Benelux", "NVidia Benelux")]
    public void WithoutLegalForm_DropsOnlyATrailingLegalForm(string company, string expected)
    {
        Assert.Equal(expected, DocumentTitle.WithoutLegalForm(company));
    }

    [Fact]
    public void Compose_InvoiceWithoutReadableDate_KeepsCompanyAndNature()
    {
        var facts = new DocumentFacts(true, "Garage Peeters BV", "Onderhoud", "14/09/2026", "");

        Assert.Equal("Garage Peeters-Onderhoud", DocumentTitle.Compose(facts));
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
