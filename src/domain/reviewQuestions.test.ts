import { describe, expect, it } from "vitest";
import { normalizeReviewQuestion, readReviewQuestions } from "./reviewQuestions";

/** Linjene i seksjonen, nummerert fra `first`. */
function lines(text: string, first = 1) {
  return text.split("\n").map((t, i) => ({ text: t, line: first + i }));
}

const texts = (text: string) => readReviewQuestions(lines(text)).map((q) => q.text);

// Kopiert uendret fra PRD-addendumet («Gjennomgangsspørsmål til kapittel 1»), med skrivefeilene.
const ADDENDUM_CHAPTER_1 = `1. Hva er årsaken til økt gobal konkurranse?
2. Hva er konsekvensen av global konkurranse for organisasjoner?
3. begrepet "informasjonsrevolusjon", hva menes med det?
4. Hva forårsaket informasjonsrevolusjonen?
5. Hva er implikasjonene av informasjonsrevolusjonen for deg?
6. hva er kunnskapsarbeidere?
7. Hvilke ferdigheter har kunnskapsarbeidere?
8. Hvorfor er kunnskapsarbeidere viktig for organisajsonen?
9. Hva er noen av de viktigste foretningsprosessene i en organisasjon?
10. Har alle selskap de samme nøkkelprosessene?
11. Hvorfor, eller hvorfor ikke har selskap de samme nøkkkelprosessene?
12. Hva er en felles organisasjonstruktur?
13. Hva er fordelen med en organisasjonssktruktur, og hvorfor utviklet denne strukturen seg?
14. Hva er de typiske funksjonene eller avdelingene i en organisasjon?
15. Hvilket arbeid utføres i hver av disse avdelingene?
16. Hva er ulempen med en funksjonell organisasjonstruktur?
17. Hvilke negative konsekvenser fører de til med en funksjonell organisasjonsturktur ?
18. Hva er funksjonellle informasjonssytemet?
19. Hva er informasjonssystemets verdi for oranisasjoner, o ghva er ders største ulemper?
20. Hva er bedriftssystemer?
21. Hvordan skiller de seg fra funksjonelle informasjonssystemer?
22. Hva er verdien av bedriftssystemer for organisasjoner?
23. Hva er foretningsprosesser?
24. Forklar de ulike flytene som er knyttet til en foretningsprosess?
25. Hva er en kontoplan?
26. Hvordan er kontolan rellatert til de to viktigste økonomiske dokumentene?
27. Hva er de to viktigste økonomiske dokumentene?
28. Forklar hvordan prosesser påvirker de to viktigste økonomiske dokumentene.
29. Under hvilke omstendigheter har et prosesstrinn en innvirkning på et selskaps økonomi?`;

describe("readReviewQuestions", () => {
  it("gir 29 spørsmål i rekkefølgen 1–29 fra addendumet, uten nummer og uten innledningen", () => {
    const questions = readReviewQuestions(lines(`Innledning om spørsmålene.\n\n${ADDENDUM_CHAPTER_1}\n`, 10));
    expect(questions).toHaveLength(29);
    expect(questions[0]).toEqual({ text: "Hva er årsaken til økt gobal konkurranse?", line: 12 });
    expect(questions[9].text).toBe("Har alle selskap de samme nøkkelprosessene?");
    expect(questions[28]).toEqual({
      text: "Under hvilke omstendigheter har et prosesstrinn en innvirkning på et selskaps økonomi?",
      line: 40,
    });
    expect(questions.map((q) => q.line)).toEqual(Array.from({ length: 29 }, (_, i) => 12 + i));
    expect(questions.some((q) => q.text.includes("Innledning"))).toBe(false);
  });

  it("tar med underpunktene i spørsmålet over, med linjeskift og innrykk", () => {
    expect(
      texts("1. Hva?\n2. Definer følgende begreper:\n   - a) FOB (free on board)\n   - b) Betalingsbetingelser\n"),
    ).toEqual(["Hva?", "Definer følgende begreper:\n   - a) FOB (free on board)\n   - b) Betalingsbetingelser"]);
  });

  it("avslutter lista ved en linje uten nummer og innrykk etter en blank linje", () => {
    const section = [
      "5. Definer følgende begreper:",
      "   - a) FOB",
      "   - e) Treveismatch",
      "",
      "**Må avklares før bruk:**",
      "- **Spørsmål 5a:** noe.",
      "6. Står etter at lista er slutt.",
    ].join("\n");
    expect(texts(section)).toEqual(["Definer følgende begreper:\n   - a) FOB\n   - e) Treveismatch"]);
  });

  it("tar med linjer rett under uten innrykk, og innrykkede linjer etter en blank linje", () => {
    expect(texts("1. Første del\nfortsetter her.\n\n   - a) underpunkt\n2. Neste?")).toEqual([
      "Første del\nfortsetter her.\n   - a) underpunkt",
      "Neste?",
    ]);
  });

  it("starter ikke et spørsmål med et nummer midt på linja", () => {
    expect(texts("Fra innliming 2. Spørsmålene dekker hele kapittelet.\n\n1. Forklar forskjellen.")).toEqual([
      "Forklar forskjellen.",
    ]);
  });

  it("starter et spørsmål uten mellomrom etter punktumet", () => {
    expect(texts("Innledning.\n\n1.Hva?\n2.  Hvorfor?")).toEqual(["Hva?", "Hvorfor?"]);
  });

  it("starter ikke et spørsmål når et tall står rett etter punktumet", () => {
    expect(texts("1.2 Ikke et spørsmål\n\n1. Hva?\n1.3 fortsetter")).toEqual(["Hva?\n1.3 fortsetter"]);
  });

  it("starter ikke et spørsmål med et delkapittelnummer eller et innrykket nummer", () => {
    expect(texts("1. Hva?\n   2. Underpunkt\n1.2 Ikke et nummer")).toEqual(["Hva?\n   2. Underpunkt\n1.2 Ikke et nummer"]);
  });

  it("gir ingen spørsmål uten nummererte linjer", () => {
    expect(texts("Bare innledning.\n\n- et punkt")).toEqual([]);
  });

  it("gir tom tekst for et nummer uten tekst, så notatfila kan avvise det", () => {
    expect(texts("1.\n2. Hva?")).toEqual(["", "Hva?"]);
  });
});

describe("normalizeReviewQuestion", () => {
  it("slår sammen whitespace, trimmer og gir små bokstaver", () => {
    expect(normalizeReviewQuestion("  Forklar   de ulike\n   flytene. ")).toBe("forklar de ulike flytene.");
    expect(normalizeReviewQuestion("forklar  de ulike flytene.")).toBe(normalizeReviewQuestion("Forklar de ulike flytene."));
  });

  it("gir samme tekst for sammensatte og dekomponerte bokstaver", () => {
    const composed = "Hva er årsaken til økt konkurranse?".normalize("NFC");
    const decomposed = composed.normalize("NFD");
    expect(decomposed).not.toBe(composed);
    expect(normalizeReviewQuestion(decomposed)).toBe(normalizeReviewQuestion(composed));
  });

  it("beholder tegnsettingen", () => {
    expect(normalizeReviewQuestion("Hva er en kontoplan?")).not.toBe(normalizeReviewQuestion("Hva er en kontoplan"));
  });
});
