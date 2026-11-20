// Tester tolkingen og reglene for `## Quizspørsmål` gjennom `parseContentFile`, slik importen bruker dem.
import { describe, expect, it } from "vitest";
import type { ChapterInput } from "./chapter";
import { parseContentFile } from "./contentFile";
import { isYesNoAnswer, questionBankContentSource, sameAnswer, type OwnQuestions } from "./questionBank";

const notes: ChapterInput = {
  number: 1,
  title: "Kapittel én",
  learningGoals: "",
  keyConcepts: "",
  subchapters: [
    { number: "1.1", title: "En", noteText: "Notat en" },
    { number: "1.2", title: "To", noteText: "*Ingen notater ennå.*" },
  ],
};

const target = { courseCode: "IBE430", chapterNumber: 1 };
const hash = "c".repeat(64);
const front = "---\nemne: IBE430\nkapittel: 1\ninstruksjon: innhold.v2\nmodell: claude-code/claude-opus-5-5\n---\n";

type Q = { heading: string; options?: string; extra?: string; theme?: string };

function question({ heading, options, extra = "", theme }: Q, i: number): string {
  const opts = options ?? "- [ ] Gal 1\n- [x] Riktig\n- [ ] Gal 2\n- [ ] Gal 3";
  return `#### ${heading}\n${opts}\nForklaring: Fordi ${i}.\nTema: ${theme ?? (i % 2 === 0 ? "Alfa" : "Beta")}\n${extra}`;
}

/** En bank for 1.1 med 20 spørsmål fordelt på temaene Alfa og Beta. `change` kan bytte ut spørsmål. */
function bank(change: (qs: Q[]) => Q[] = (qs) => qs, themes = "- Alfa\n- Beta"): string {
  const qs = change(Array.from({ length: 20 }, (_, i) => ({ heading: `Spørsmål ${i + 1}?` })));
  return `${front}\n## Quizspørsmål\n\n### 1.1 En\n<!-- inputHash: ${hash} -->\nTemaer:\n${themes}\n\n${qs
    .map((q, i) => question(q, i))
    .join("\n")}`;
}

const own: OwnQuestions = {
  questions: [
    { number: 1, subchapter: "1.1", question: "Hva er en prosess?", answer: "En rekke trinn.", line: 5 },
    { number: 2, subchapter: "1.1", question: "Er salg en prosess?", answer: "Nei.", line: 6 },
  ],
  skipped: [3],
};

function errorsOf(text: string, ownQuestions?: OwnQuestions): string[] {
  const result = parseContentFile(text, notes, target, ownQuestions);
  return result.ok ? [] : result.errors;
}

describe("## Quizspørsmål", () => {
  it("tolker temalisten og 20 spørsmål med fire alternativer", () => {
    const result = parseContentFile(bank(), notes, target);
    if (!result.ok) throw new Error(result.errors.join("\n"));
    const [only] = result.value.questionBanks;
    expect(only.number).toBe("1.1");
    expect(only.inputHash).toBe(hash);
    expect(only.themes).toEqual(["Alfa", "Beta"]);
    expect(only.questions).toHaveLength(20);
    expect(only.questions[0]).toEqual({
      question: "Spørsmål 1?",
      options: ["Gal 1", "Riktig", "Gal 2", "Gal 3"],
      correctIndex: 1,
      explanation: "Fordi 0.",
      theme: "Alfa",
      source: null,
      original: null,
      line: 16,
    });
  });

  it("avviser tre alternativer, to riktige, ukjent tema og 19 spørsmål", () => {
    const errors = errorsOf(
      bank((qs) => {
        qs[0].options = "- [x] A\n- [ ] B\n- [ ] C";
        qs[1].options = "- [x] A\n- [x] B\n- [ ] C\n- [ ] D";
        qs[2].theme = "Gamma";
        return qs.slice(0, 19);
      }),
    );
    expect(errors).toEqual([
      "Linje 16: «Spørsmål 1?»: har 3 alternativer, men skal ha 4.",
      "Linje 23: «Spørsmål 2?»: har 2 riktige alternativer, men skal ha nøyaktig ett.",
      "Linje 31: «Spørsmål 3?»: temaet «Gamma» står ikke i temalisten.",
    ]);
    expect(errorsOf(bank((qs) => qs.slice(0, 19)))).toEqual([
      "Linje 10: delkapittel 1.1 har 19 spørsmål, men skal ha 20.",
    ]);
  });

  it("avviser to like alternativer", () => {
    const errors = errorsOf(
      bank((qs) => {
        qs[0].options = "- [x] Riktig\n- [ ] riktig.\n- [ ] C\n- [ ] D";
        return qs;
      }),
    );
    expect(errors).toEqual(["Linje 16: «Spørsmål 1?»: to alternativer er like."]);
  });

  it("krever minst to spørsmål per tema og ingen like spørsmål", () => {
    const oneGamma = bank((qs) => {
      qs[0].theme = "Gamma";
      qs[3].heading = "Spørsmål 1?";
      return qs;
    }, "- Alfa\n- Beta\n- Gamma");
    expect(errorsOf(oneGamma)).toEqual([
      "Linje 10: temaet «Gamma» i 1.1 har 1 spørsmål, men skal ha minst 2.",
      "Linje 41: spørsmålet står to ganger i 1.1 (første gang på linje 17).",
    ]);
  });

  it("avviser manglende temaliste, forklaring og hash, og ukjente linjer", () => {
    const text = bank().replace("Temaer:\n- Alfa\n- Beta\n", "Noe annet\n").replace("Forklaring: Fordi 0.", "Forklaring:");
    expect(errorsOf(text)).toEqual([
      "Linje 12: «Noe annet» er ukjent her. Før første spørsmål står bare «Temaer:» med én «- tema» per linje.",
      "Linje 10: delkapittel 1.1 mangler «Temaer:» før spørsmålene.",
      "Linje 14: «Spørsmål 1?»: mangler «Forklaring:».",
    ]);
    expect(errorsOf(bank().replace(`<!-- inputHash: ${hash} -->\n`, ""))).toEqual([
      "Linje 11: delkapittel 1.1 mangler «<!-- inputHash: … -->» rett under overskriften.",
    ]);
  });

  it("avviser en bank for et delkapittel uten notater", () => {
    expect(errorsOf(bank().replace("### 1.1 En", "### 1.2 To"))).toEqual([
      "Linje 10: delkapittel 1.2 har ingen notater, så det kan ikke ha spørsmålsbank.",
    ]);
  });
});

describe("brukerens egne spørsmål", () => {
  const withOwn = (first: Q, second: Q) =>
    bank((qs) => {
      qs[0] = first;
      qs[1] = second;
      return qs;
    });
  const mine: Q = {
    heading: "Hva er en prosess?",
    options: "- [ ] Én avdeling\n- [x] En rekke trinn\n- [ ] Et dokument\n- [ ] En faktura",
    extra: "Kilde: spørsmålsbank 1\n",
  };
  const rewritten: Q = {
    heading: "Hva stemmer om salg?",
    options: "- [x] Salg alene er ikke en forretningsprosess\n- [ ] A\n- [ ] B\n- [ ] C",
    extra: "Kilde: spørsmålsbank 2\nOriginal: Er salg en prosess?\n",
  };

  it("godtar fasiten som riktig alternativ og Ja/Nei skrevet om med originalteksten", () => {
    const result = parseContentFile(withOwn(mine, rewritten), notes, target, own);
    if (!result.ok) throw new Error(result.errors.join("\n"));
    const [first, second] = result.value.questionBanks[0].questions;
    expect(first).toMatchObject({ source: 1, original: null, correctIndex: 1 });
    expect(second).toMatchObject({ source: 2, original: "Er salg en prosess?" });
  });

  it("avviser feil fasit, manglende Original og et manglende eget spørsmål", () => {
    const wrong = { ...mine, options: "- [x] Én avdeling\n- [ ] En rekke trinn\n- [ ] C\n- [ ] D" };
    const noOriginal = { ...rewritten, extra: "Kilde: spørsmålsbank 2\n" };
    expect(errorsOf(withOwn(wrong, noOriginal), own)).toEqual([
      "Linje 16: det riktige alternativet for spørsmål 1 må være brukerens fasit: «En rekke trinn.».",
      "Linje 25: spørsmål 2 har fasit «Nei.» og må skrives om, med originalteksten i «Original:».",
    ]);
    expect(errorsOf(bank(), own)).toEqual([
      "Linje 10: spørsmål 1 fra «## Spørsmålsbank» mangler i 1.1 (merk det med «Kilde: spørsmålsbank 1»).",
      "Linje 10: spørsmål 2 fra «## Spørsmålsbank» mangler i 1.1 (merk det med «Kilde: spørsmålsbank 2»).",
    ]);
  });

  it("avviser et spørsmål som skal avklares før bruk, og et ukjent nummer", () => {
    const skipped = { heading: "X?", extra: "Kilde: spørsmålsbank 3\n" };
    const unknown = { heading: "Y?", extra: "Kilde: spørsmålsbank 9\n" };
    expect(errorsOf(withOwn(skipped, unknown), { questions: [], skipped: [3] })).toEqual([
      "Linje 16: spørsmål 3 i «## Spørsmålsbank» skal avklares før bruk og kan ikke være med.",
      "Linje 25: spørsmål 9 finnes ikke i «## Spørsmålsbank» i notatfilen.",
    ]);
  });
});

describe("hjelperegler", () => {
  it("sammenligner fasit uten hensyn til punktum, mellomrom og store bokstaver", () => {
    expect(sameAnswer("Finansregnskap", "Finansregnskap.")).toBe(true);
    expect(sameAnswer("  en  rekke trinn ", "En rekke trinn.")).toBe(true);
    expect(sameAnswer("Masterdata", "Transaksjonsdata.")).toBe(false);
  });

  it("kjenner igjen Ja og Nei som fasit", () => {
    expect(isYesNoAnswer("Ja.")).toBe(true);
    expect(isYesNoAnswer("nei")).toBe(true);
    expect(isYesNoAnswer("Ja, fordi …")).toBe(false);
  });

  it("gir samme innholdskilde for samme bank uansett linjenumre", () => {
    const a = parseContentFile(bank(), notes, target);
    const b = parseContentFile(bank().replace("### 1.1 En", "\n\n### 1.1 En"), notes, target);
    if (!a.ok || !b.ok) throw new Error("ugyldig");
    expect(questionBankContentSource(a.value.questionBanks[0])).toBe(questionBankContentSource(b.value.questionBanks[0]));
  });
});
