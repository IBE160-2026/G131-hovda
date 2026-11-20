/// <reference types="vite/client" />
// Tester tolkingen av innholdsfilen mot små eksempler for feilene og mot den ekte fila for kapittel 1.
import { describe, expect, it } from "vitest";
import innhold1 from "../../G131-hovda/notater/IBE430/kapittel-1.innhold.md?raw";
import kapittel1 from "../../G131-hovda/notater/IBE430/kapittel-1.md?raw";
import type { ChapterInput } from "./chapter";
import { CONTENT_INSTRUCTION_VERSION, parseContentFile } from "./contentFile";
import { parseNotesFile } from "./notesFile";

const notes: ChapterInput = {
  number: 1,
  title: "Kapittel én",
  learningGoals: "- mål",
  keyConcepts: "",
  subchapters: [
    { number: "1.1", title: "En", noteText: "Notat en" },
    { number: "1.2", title: "To", noteText: "Notat to" },
    { number: "1.3", title: "Tre", noteText: "*Ingen notater ennå.*" },
  ],
};

const target = { courseCode: "ibe430", chapterNumber: 1 };
const hashA = "a".repeat(64);
const hashB = "b".repeat(64);

const front = "---\nemne: IBE430\nkapittel: 1\ninstruksjon: innhold.v1\nmodell: claude-code/claude-opus-5-5\n---\n";

const golden = `${front}
## Sammendrag

### 1.1 En
<!-- inputHash: ${hashA} -->
Første avsnitt.

- punkt

### 1.2 Annen tittel enn i notatfilen

<!-- inputHash: ${hashB} -->
Andre.
`;

function errorsOf(text: string): string[] {
  const result = parseContentFile(text, notes, target);
  return result.ok ? [] : result.errors;
}

describe("parseContentFile", () => {
  it("tolker frontmatter og ett sammendrag per delkapittel", () => {
    expect(parseContentFile(golden, notes, target)).toEqual({
      ok: true,
      value: {
        courseCode: "IBE430",
        chapterNumber: 1,
        instruction: "innhold.v1",
        model: "claude-code/claude-opus-5-5",
        summaries: [
          { number: "1.1", inputHash: hashA, text: "Første avsnitt.\n\n- punkt", line: 10 },
          { number: "1.2", inputHash: hashB, text: "Andre.", line: 16 },
        ],
        questionBanks: [],
      },
    });
  });

  it("godtar \\r\\n, BOM og en fil uten sammendrag", () => {
    expect(parseContentFile(`﻿${golden.replace(/\n/g, "\r\n")}`, notes, target).ok).toBe(true);
    const empty = parseContentFile(`${front}\n## Sammendrag\n`, notes, target);
    expect(empty.ok && empty.value.summaries).toEqual([]);
  });

  it("teller ikke overskrifter inne i kodeblokker", () => {
    const text = golden.replace("Andre.", "```md\n## Ikke en seksjon\n### 1.9 heller ikke\n```");
    const result = parseContentFile(text, notes, target);
    expect(result.ok && result.value.summaries[1].text).toBe("```md\n## Ikke en seksjon\n### 1.9 heller ikke\n```");
  });

  it("avviser feil emne og kapittel og manglende instruksjon og modell", () => {
    const text = golden
      .replace("emne: IBE430", "emne: IBE999")
      .replace("kapittel: 1", "kapittel: 2")
      .replace("instruksjon: innhold.v1\n", "")
      .replace("modell: claude-code/claude-opus-5-5", "modell:");
    expect(errorsOf(text)).toEqual([
      "Linje 5: frontmatter mangler «instruksjon».",
      "Linje 4: frontmatter mangler «modell».",
      "Linje 2: emne er IBE999 i innholdsfilen, men importen gjelder IBE430.",
      "Linje 3: kapittel er 2 i innholdsfilen, men filen er kapittel-1.innhold.md.",
    ]);
  });

  it("krever frontmatter", () => {
    expect(errorsOf("## Sammendrag\n")).toEqual(["Linje 1: filen må starte med frontmatter mellom to linjer med «---»."]);
    expect(errorsOf("---\nemne: IBE430\n")).toEqual([
      "Linje 1: frontmatter slutter aldri. Avslutt den med en linje med «---».",
    ]);
  });

  it("avviser tomt sammendrag og mer enn 600 ord", () => {
    const text = golden.replace("Første avsnitt.\n\n- punkt", "  ").replace("Andre.", Array(601).fill("ord").join(" "));
    expect(errorsOf(text)).toEqual([
      "Linje 10: delkapittel 1.1: Sammendraget er tomt.",
      "Linje 14: delkapittel 1.2: Sammendraget har 601 ord, mer enn 600.",
    ]);
  });

  it("avviser ukjent delkapittel, delkapittel uten notater og dobbelt delkapittel", () => {
    const extra = (n: string) => `\n### ${n} X\n<!-- inputHash: ${hashA} -->\nTekst.\n`;
    expect(errorsOf(golden + extra("1.9") + extra("1.3") + extra("1.1"))).toEqual([
      "Linje 29: delkapittel 1.1 står to ganger under «## Sammendrag» (første gang på linje 10).",
      "Linje 21: delkapittel 1.9 finnes ikke i notatfilen for kapittel 1.",
      "Linje 25: delkapittel 1.3 har ingen notater, så det kan ikke ha sammendrag.",
    ]);
  });

  it("avviser manglende og ugyldig hash", () => {
    const text = golden.replace(`<!-- inputHash: ${hashA} -->\n`, "").replace(hashB, "ABC");
    expect(errorsOf(text)).toEqual([
      "Linje 11: delkapittel 1.1 mangler «<!-- inputHash: … -->» rett under overskriften.",
      "Linje 17: inputHash for 1.2 må være 64 hex-tegn (0–9, a–f), men er «ABC».",
    ]);
  });

  it("avviser ukjente seksjoner, tekst utenfor delkapitler og overskrifter som ikke er delkapitler", () => {
    const text = `${front}\n# Tittel\n\n## Sammendrag\n\nInnledning.\n\n### Ikke et nummer\n\n## Annet\n\n### 1.1 En\n`;
    expect(errorsOf(text)).toEqual([
      "Linje 8: «# Tittel» er ikke en kjent seksjon. Bruk «## Sammendrag» eller «## Quizspørsmål».",
      "Linje 12: tekst under «## Sammendrag» må stå under et delkapittel («### n.m Tittel»).",
      "Linje 14: «### Ikke et nummer» er ikke et delkapittel. Skriv «### n.m Tittel».",
      "Linje 16: «## Annet» er ikke en kjent seksjon. Bruk «## Sammendrag» eller «## Quizspørsmål».",
      "Linje 18: «### 1.1 En» står utenfor «## Sammendrag» og «## Quizspørsmål».",
    ]);
  });

  it("avviser seksjonen to ganger og en kodeblokk som aldri slutter", () => {
    expect(errorsOf(`${golden}\n## Sammendrag\n`)).toEqual([
      "Linje 21: seksjonen «## Sammendrag» står to ganger (første gang på linje 8).",
    ]);
    expect(errorsOf(golden.replace("Andre.", "```\nAndre."))).toEqual(["Linje 19: kodeblokken som starter her, slutter aldri."]);
  });
});

describe("innholdsfilen for IBE430 kapittel 1", () => {
  it("er gyldig mot notatfilen og har sammendrag for alle seks delkapitlene", () => {
    const parsedNotes = parseNotesFile(kapittel1);
    if (!parsedNotes.ok) throw new Error(parsedNotes.errors.join("\n"));
    const content = parseContentFile(innhold1, parsedNotes.value.chapter, target, parsedNotes.value.ownQuestions);
    if (!content.ok) throw new Error(content.errors.join("\n"));
    expect(content.value.instruction).toBe(CONTENT_INSTRUCTION_VERSION);
    expect(content.value.summaries.map((s) => s.number)).toEqual(["1.1", "1.2", "1.3", "1.4", "1.5", "1.6"]);
  });
});
