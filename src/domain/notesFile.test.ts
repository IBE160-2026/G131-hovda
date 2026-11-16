/// <reference types="vite/client" />
// Tester tolkingen mot de ekte notatfilene (kapittel 1–5) og mot små eksempler for feilene.
import { describe, expect, it } from "vitest";
import kapittel1 from "../../G131-hovda/notater/IBE430/kapittel-1.md?raw";
import kapittel2 from "../../G131-hovda/notater/IBE430/kapittel-2.md?raw";
import kapittel3 from "../../G131-hovda/notater/IBE430/kapittel-3.md?raw";
import kapittel4 from "../../G131-hovda/notater/IBE430/kapittel-4.md?raw";
import kapittel5 from "../../G131-hovda/notater/IBE430/kapittel-5.md?raw";
import { hasNotes } from "./hasNotes";
import { checkNotesFileTarget, parseNotesFile, type NotesFile } from "./notesFile";

function parsed(text: string): NotesFile {
  const result = parseNotesFile(text);
  if (!result.ok) throw new Error(result.errors.join("\n"));
  return result.value;
}

function errorsOf(text: string): string[] {
  const result = parseNotesFile(text);
  if (result.ok) throw new Error("Ventet feil, men filen ble godtatt.");
  return result.errors;
}

/** Bytter ut linje `lineNo` (fra 1) i teksten. */
function replaceLine(text: string, lineNo: number, replacement: string): string {
  const lines = text.split(/\r?\n/);
  lines[lineNo - 1] = replacement;
  return lines.join("\n");
}

const excluded = ["## Råtekst", "## Rettelser", "## Gjennomgangsspørsmål", "## Spørsmålsbank", "Innliming"];

function allText(file: NotesFile): string {
  const { chapter } = file;
  return [
    chapter.learningGoals,
    chapter.keyConcepts,
    ...chapter.subchapters.flatMap((s) => [s.title, s.noteText]),
  ].join("\n");
}

describe("parseNotesFile med de ekte filene", () => {
  it("tolker kapittel 1 med tittel, læringsmål og seks delkapitler med notater", () => {
    const file = parsed(kapittel1);
    expect(file.courseCode).toBe("IBE430");
    expect(file.chapter.number).toBe(1);
    expect(file.chapter.title).toBe("Organisasjoner, forretningsprosesser og informasjonssystemer");
    expect(file.chapter.learningGoals).toContain("Forstå at arbeid i organisasjoner utføres i prosesser");
    expect(file.chapter.keyConcepts).toBe("");
    expect(file.chapter.subchapters.map((s) => s.number)).toEqual(["1.1", "1.2", "1.3", "1.4", "1.5", "1.6"]);
    expect(file.chapter.subchapters[0].title).toBe("Det moderne globale forretningsmiljøet");
    expect(file.chapter.subchapters[5].title).toBe("Den økonomiske effekten av prosesstegene");
    expect(file.chapter.subchapters.every((s) => hasNotes(s.noteText))).toBe(true);
    expect(file.chapter.subchapters[0].noteText.startsWith("Organisasjoner skaper og leverer verdi")).toBe(true);
    expect(file.chapter.subchapters[5].noteText.endsWith("En bedrift er lovpålagt å føre finansregnskap.")).toBe(true);
  });

  it("tolker kapittel 2 med nøkkelbegreper etter delkapitlene, og 2.3 og 2.5 uten notater", () => {
    const file = parsed(kapittel2);
    expect(file.chapter.title).toBe("Forretningssystemer");
    expect(file.chapter.subchapters.map((s) => s.number)).toEqual(["2.1", "2.2", "2.3", "2.4", "2.5"]);
    expect(file.chapter.keyConcepts).toContain("- ERP: Bedriftsressursplanlegging");
    expect(file.chapter.keyConcepts).toContain("- SCM: Forsyningskjedeadministrasjon");
    const withoutNotes = file.chapter.subchapters.filter((s) => !hasNotes(s.noteText)).map((s) => s.number);
    expect(withoutNotes).toEqual(["2.3", "2.5"]);
    expect(file.chapter.subchapters[2].noteText).toBe("*Ingen notater ennå.*");
    // Delkapittelet slutter ved neste ##, så nøkkelbegrepene havner ikke i 2.5.
    expect(file.chapter.subchapters[4].noteText).not.toContain("CRM");
  });

  it.each([
    [kapittel3, 3, "Innkjøpsprosessen", ["3.1", "3.2"]],
    [kapittel4, 4, "Salgsprosessen", ["4.1", "4.2"]],
    [kapittel5, 5, "Produksjonsprosessen", ["5.1", "5.2"]],
  ])("tolker kapittel %#", (text, number, title, numbers) => {
    const file = parsed(text);
    expect(file.chapter.number).toBe(number);
    expect(file.chapter.title).toBe(title);
    expect(file.chapter.learningGoals).not.toBe("");
    expect(file.chapter.subchapters.map((s) => s.number)).toEqual(numbers);
  });

  it.each([kapittel1, kapittel2, kapittel3, kapittel4, kapittel5])(
    "tar aldri med råtekst, rettelser, gjennomgangsspørsmål eller spørsmålsbank (fil %#)",
    (text) => {
      const all = allText(parsed(text));
      for (const marker of excluded) expect(all).not.toContain(marker);
      expect(all).not.toContain("spm:");
      expect(all).not.toContain("```");
    },
  );

  it("lager ikke delkapitler av «### Innliming» under råteksten", () => {
    const file = parsed(kapittel1);
    expect(file.chapter.subchapters.some((s) => s.title.includes("Innliming"))).toBe(false);
  });

  it("gir samme resultat med Windows-linjeskift", () => {
    const lf = kapittel2.replace(/\r\n/g, "\n");
    expect(parsed(lf.replace(/\n/g, "\r\n"))).toEqual(parsed(lf));
  });
});

const small = (body: string, front = 'emne: IBE430\nkapittel: 1\ntittel: "Kapittel én"') =>
  `---\n${front}\n---\n${body}`;

describe("parseNotesFile med feil", () => {
  it("avviser et delkapittel fra et annet kapittel, med linjenummer", () => {
    const text = replaceLine(kapittel1, 27, "### 2.1 Det moderne globale forretningsmiljøet");
    expect(errorsOf(text)).toEqual(["Linje 27: delkapittel 2.1 hører ikke til kapittel 1."]);
  });

  it("avviser et delkapittel som står to ganger", () => {
    const lines = Array.from({ length: 45 }, () => "tekst");
    lines[0] = "---";
    lines[1] = "emne: IBE430";
    lines[2] = "kapittel: 1";
    lines[3] = "tittel: Kapittel én";
    lines[4] = "---";
    lines[29] = "## Fordelt på delkapitler";
    lines[30] = "### 1.2 Første";
    lines[39] = "### 1.2 Andre";
    expect(errorsOf(lines.join("\n"))).toEqual([
      "Linje 40: delkapittel 1.2 står to ganger (første gang på linje 31).",
    ]);
  });

  it("gir alle feilene på en gang", () => {
    const errors = errorsOf(small("## Fordelt på delkapitler\n### 1.1 A\n### 2.1 B\n### 1.1 C\n### Annet"));
    expect(errors).toEqual([
      "Linje 8: delkapittel 2.1 hører ikke til kapittel 1.",
      "Linje 9: delkapittel 1.1 står to ganger (første gang på linje 7).",
      "Linje 10: «### Annet» under «## Fordelt på delkapitler» er ikke et delkapittel. Skriv «### n.m Tittel».",
    ]);
  });

  it("krever frontmatter", () => {
    expect(errorsOf("# Notater\n## Fordelt på delkapitler\n### 1.1 A")).toEqual([
      "Linje 1: filen må starte med frontmatter mellom to linjer med «---».",
    ]);
  });

  it("krever emne, kapittel og tittel i frontmatter", () => {
    const errors = errorsOf(small("## Fordelt på delkapitler\n### 1.1 A", "lagt_inn: 2026-10-08"));
    expect(errors).toEqual([
      "Linje 3: frontmatter mangler «emne».",
      "Linje 3: frontmatter mangler «kapittel».",
      "Linje 3: frontmatter mangler «tittel».",
    ]);
  });

  it("avviser et kapittelnummer som ikke er et tall", () => {
    const errors = errorsOf(small("## Fordelt på delkapitler\n### 1.1 A", "emne: IBE430\nkapittel: en\ntittel: X"));
    expect(errors).toEqual(["Linje 3: «kapittel» må være et helt tall fra 1, men er «en»."]);
  });

  it("krever seksjonen med delkapitler og minst ett delkapittel", () => {
    expect(errorsOf(small("## Læringsmål for kapittelet\n- mål"))).toEqual([
      "Fant ikke seksjonen «## Fordelt på delkapitler».",
    ]);
    expect(errorsOf(small("## Fordelt på delkapitler\nIngen her."))).toEqual([
      "Linje 6: «## Fordelt på delkapitler» har ingen delkapitler («### n.m Tittel»).",
    ]);
  });

  it("avviser en kodeblokk som aldri slutter", () => {
    expect(errorsOf(small("## Fordelt på delkapitler\n### 1.1 A\n```text\n### 1.2 B"))).toEqual([
      "Linje 8: kodeblokken som starter her, slutter aldri.",
    ]);
  });
});

describe("parseNotesFile med små eksempler", () => {
  it("lar overskrifter i kodeblokker være tekst og stopper delkapittelet ved neste ##", () => {
    const file = parsed(
      small(
        [
          "## Fordelt på delkapitler",
          "Innledning som ikke er med.",
          "### 1.1 Første",
          "",
          "Tekst.",
          "```",
          "## Ikke en seksjon",
          "```",
          "## Rettelser",
          "Rettelse som ikke er med.",
        ].join("\n"),
      ),
    );
    expect(file.chapter.subchapters).toEqual([
      { number: "1.1", title: "Første", noteText: "Tekst.\n```\n## Ikke en seksjon\n```" },
    ]);
  });

  it("normaliserer nummeret og lar læringsmål og nøkkelbegreper være tomme når de mangler", () => {
    const file = parsed(small("## Fordelt på delkapitler\n### 1.01 Første\n*Ingen notater ennå.*"));
    expect(file.chapter.subchapters).toEqual([
      { number: "1.1", title: "Første", noteText: "*Ingen notater ennå.*" },
    ]);
    expect(file.chapter.learningGoals).toBe("");
    expect(file.chapter.keyConcepts).toBe("");
  });
});

describe("checkNotesFileTarget", () => {
  const file = parsed(kapittel1);

  it("godtar riktig emne og kapittel, uansett store eller små bokstaver i emnekoden", () => {
    expect(checkNotesFileTarget(file, { courseCode: "ibe430", chapterNumber: 1 })).toEqual([]);
  });

  it("nevner begge verdiene når kapittel er ulikt filnavnet", () => {
    expect(checkNotesFileTarget(file, { courseCode: "IBE430", chapterNumber: 2 })).toEqual([
      "Linje 3: kapittel er 1 i frontmatter, men filen er kapittel-2.md.",
    ]);
  });

  it("nevner begge verdiene når emne er ulikt argumentet", () => {
    expect(checkNotesFileTarget(file, { courseCode: "IBE160", chapterNumber: 1 })).toEqual([
      "Linje 2: emne er IBE430 i frontmatter, men importen gjelder IBE160.",
    ]);
  });
});
