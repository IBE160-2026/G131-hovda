import { describe, expect, it } from "vitest";
import { parseInline, parseSummaryMarkdown } from "./summaryMarkdown";

const text = (t: string) => ({ kind: "text", text: t });
const bold = (t: string) => ({ kind: "bold", text: t });

describe("parseInline", () => {
  it("gjør **…** om til fet tekst", () => {
    expect(parseInline("En **fet** og **enda en**.")).toEqual([
      text("En "),
      bold("fet"),
      text(" og "),
      bold("enda en"),
      text("."),
    ]);
  });

  it("lar ulukkede ** stå som tekst", () => {
    expect(parseInline("En **fet** og ** ulukket")).toEqual([text("En "), bold("fet"), text(" og ** ulukket")]);
    expect(parseInline("**")).toEqual([text("**")]);
  });

  it("lager ikke fet tekst av tomme par", () => {
    expect(parseInline("a **** b")).toEqual([text("a **** b")]);
  });

  it("gir ingen segmenter for tom linje", () => {
    expect(parseInline("")).toEqual([]);
  });

  it("lar annen Markdown stå som den er", () => {
    expect(parseInline("*kursiv* og `kode` og # tittel")).toEqual([text("*kursiv* og `kode` og # tittel")]);
  });
});

describe("parseSummaryMarkdown", () => {
  it("skiller blokker med tomme linjer og gjenkjenner punktlister", () => {
    const md = "Første avsnitt\nfortsetter.\n\n- **En:** først\n- to\n\r\n  \nSiste.";
    expect(parseSummaryMarkdown(md)).toEqual([
      { kind: "paragraph", lines: [[text("Første avsnitt")], [text("fortsetter.")]] },
      { kind: "list", items: [[bold("En:"), text(" først")], [text("to")]] },
      { kind: "paragraph", lines: [[text("Siste.")]] },
    ]);
  });

  it("gjør en blokk der ikke alle linjene starter med «- », til et avsnitt", () => {
    expect(parseSummaryMarkdown("Innledning:\n- en")).toEqual([
      { kind: "paragraph", lines: [[text("Innledning:")], [text("- en")]] },
    ]);
  });

  it("gir ingen blokker for tom tekst", () => {
    expect(parseSummaryMarkdown("  \n\n ")).toEqual([]);
  });
});
