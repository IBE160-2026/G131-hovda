/**
 * Tolker en notatfil (`notater/<EMNE>/kapittel-<n>.md`) til kapittel, delkapitler og notater
 * (FR-8). Ren funksjon uten avhengigheter (AD-2). Hele filen valideres, og feil gir norsk
 * melding med linjenummer (AD-17).
 *
 * Format: frontmatter (`emne`, `kapittel`, `tittel`) og så `##`-seksjoner. Bare tre seksjoner
 * tas med: `## Læringsmål for kapittelet`, `## Nøkkelbegreper` og `## Fordelt på delkapitler`.
 * Delkapitler er `### n.m Tittel` under `## Fordelt på delkapitler` og slutter ved neste `###`
 * eller `##`. Alt annet (`## Råtekst`, `## Rettelser`, `## Gjennomgangsspørsmål`,
 * `## Spørsmålsbank`, `### Innliming …`) tas aldri med i notatene. Overskrifter inne i kodeblokker
 * teller ikke.
 *
 * Tabellen i `## Spørsmålsbank` (`#`, `Delkapittel`, `Spørsmål`, `Fasit`) leses for seg, til
 * brukerens egne quizspørsmål (FR-13, AD-6). Spørsmål med nummeret i den fete starten av et punkt
 * under «**Må avklares før bruk:**» hoppes over. Tall ellers i punktteksten teller ikke.
 */
import type { ChapterInput, SubchapterInput } from "./chapter";
import { normalizeCourseCode } from "./course";
import type { OwnQuestion, OwnQuestions } from "./questionBank";

export const SECTION_LEARNING_GOALS = "Læringsmål for kapittelet";
export const SECTION_KEY_CONCEPTS = "Nøkkelbegreper";
export const SECTION_SUBCHAPTERS = "Fordelt på delkapitler";
export const SECTION_QUESTION_BANK = "Spørsmålsbank";

export type NotesFile = {
  /** `emne` fra frontmatter, normalisert. */
  courseCode: string;
  chapter: ChapterInput;
  /** Brukerens egne spørsmål fra `## Spørsmålsbank`. Inngår ikke i notatene eller `inputHash`. */
  ownQuestions: OwnQuestions;
  /** Linjenumrene til `emne` og `kapittel` i frontmatter, for feilmeldinger. */
  lines: { courseCode: number; chapterNumber: number };
};

export type NotesFileResult = { ok: true; value: NotesFile } | { ok: false; errors: string[] };

const at = (line: number, message: string) => `Linje ${line}: ${message}`;

type Frontmatter = {
  values: Map<string, { value: string; line: number }>;
  /** Indeksen til første linje etter frontmatter. */
  bodyStart: number;
  /** Linjenummeret til avsluttende `---`. */
  endLine: number;
};

function unquote(value: string): string {
  const v = value.trim();
  if (v.length >= 2 && ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'")))) {
    return v.slice(1, -1).trim();
  }
  return v;
}

function readFrontmatter(lines: string[], errors: string[]): Frontmatter | null {
  if (lines[0]?.trim() !== "---") {
    errors.push(at(1, "filen må starte med frontmatter mellom to linjer med «---»."));
    return null;
  }
  const end = lines.findIndex((line, i) => i > 0 && line.trim() === "---");
  if (end < 0) {
    errors.push(at(1, "frontmatter slutter aldri. Avslutt den med en linje med «---»."));
    return null;
  }
  const values = new Map<string, { value: string; line: number }>();
  for (let i = 1; i < end; i++) {
    const match = /^([A-Za-z_][\w-]*)\s*:(.*)$/.exec(lines[i]);
    if (match && !values.has(match[1])) values.set(match[1], { value: unquote(match[2]), line: i + 1 });
  }
  return { values, bodyStart: end + 1, endLine: end + 1 };
}

const SUBCHAPTER_HEADING = /^(\d+)\.(\d+)\s+(\S.*)$/;

type Collecting = { kind: "section"; name: string } | { kind: "subchapter"; index: number } | null;

/** Tolker hele notatfilen. Gir alle feilene på en gang, med linjenummer. */
export function parseNotesFile(text: string): NotesFileResult {
  const lines = text.replace(/^﻿/, "").split(/\r?\n/);
  const errors: string[] = [];

  const front = readFrontmatter(lines, errors);
  if (!front) return { ok: false, errors };

  const emne = front.values.get("emne");
  const kapittel = front.values.get("kapittel");
  const tittel = front.values.get("tittel");
  const courseCode = normalizeCourseCode(emne?.value ?? "");
  if (!emne || courseCode === "") errors.push(at(front.endLine, "frontmatter mangler «emne»."));

  let chapterNumber: number | null = null;
  if (!kapittel || kapittel.value === "") {
    errors.push(at(front.endLine, "frontmatter mangler «kapittel»."));
  } else if (!/^\d+$/.test(kapittel.value) || Number(kapittel.value) < 1) {
    errors.push(at(kapittel.line, `«kapittel» må være et helt tall fra 1, men er «${kapittel.value}».`));
  } else {
    chapterNumber = Number(kapittel.value);
  }

  const title = tittel?.value ?? "";
  if (title === "") errors.push(at(tittel?.line ?? front.endLine, "frontmatter mangler «tittel»."));

  const sectionLines = new Map<string, string[]>();
  const sectionStart = new Map<string, number>();
  const subchapters: (SubchapterInput & { lines: string[] })[] = [];
  const subchapterLine = new Map<string, number>();
  let subchaptersSection: number | null = null;
  let bankSection: number | null = null;
  const bankLines: { text: string; line: number }[] = [];
  let current: Collecting = null;
  let section: string | null = null;
  let fence: { marker: string; line: number } | null = null;

  for (let i = front.bodyStart; i < lines.length; i++) {
    const line = lines[i];
    const lineNo = i + 1;

    const fenceMatch = /^\s{0,3}(`{3,}|~{3,})/.exec(line);
    if (fenceMatch) {
      const marker = fenceMatch[1][0];
      if (!fence) fence = { marker, line: lineNo };
      else if (fence.marker === marker) fence = null;
    } else if (!fence) {
      const h1 = /^#\s/.test(line);
      const h2 = /^##\s+(.*)$/.exec(line);
      const h3 = /^###\s+(.*)$/.exec(line);
      if (h1 || h2) {
        section = h2 ? h2[1].trim() : null;
        current = null;
        if (section === SECTION_QUESTION_BANK) {
          if (bankSection !== null) {
            errors.push(at(lineNo, `seksjonen «## ${section}» står to ganger (første gang på linje ${bankSection}).`));
            section = null;
          } else {
            bankSection = lineNo;
          }
          continue;
        }
        if (section === SECTION_LEARNING_GOALS || section === SECTION_KEY_CONCEPTS || section === SECTION_SUBCHAPTERS) {
          const first = sectionStart.get(section);
          if (first !== undefined) {
            errors.push(at(lineNo, `seksjonen «## ${section}» står to ganger (første gang på linje ${first}).`));
            section = null;
          } else {
            sectionStart.set(section, lineNo);
            if (section === SECTION_SUBCHAPTERS) {
              subchaptersSection = lineNo;
            } else {
              sectionLines.set(section, []);
              current = { kind: "section", name: section };
            }
          }
        }
        continue;
      }
      if (h3 && section === SECTION_SUBCHAPTERS) {
        current = null;
        const heading = h3[1].trim();
        const match = SUBCHAPTER_HEADING.exec(heading);
        if (!match) {
          errors.push(
            at(lineNo, `«### ${heading}» under «## ${SECTION_SUBCHAPTERS}» er ikke et delkapittel. Skriv «### n.m Tittel».`),
          );
          continue;
        }
        const number = `${Number(match[1])}.${Number(match[2])}`;
        if (Number(match[2]) < 1) {
          errors.push(at(lineNo, `delkapittelnummeret ${number} er ugyldig. Delkapitler nummereres fra ${match[1]}.1.`));
          continue;
        }
        if (chapterNumber !== null && Number(match[1]) !== chapterNumber) {
          errors.push(at(lineNo, `delkapittel ${number} hører ikke til kapittel ${chapterNumber}.`));
          continue;
        }
        const first = subchapterLine.get(number);
        if (first !== undefined) {
          errors.push(at(lineNo, `delkapittel ${number} står to ganger (første gang på linje ${first}).`));
          continue;
        }
        subchapterLine.set(number, lineNo);
        subchapters.push({ number, title: match[3].trim(), noteText: "", lines: [] });
        current = { kind: "subchapter", index: subchapters.length - 1 };
        continue;
      }
    }

    if (section === SECTION_QUESTION_BANK) bankLines.push({ text: line, line: lineNo });
    else if (current?.kind === "section") sectionLines.get(current.name)!.push(line);
    else if (current?.kind === "subchapter") subchapters[current.index].lines.push(line);
  }

  if (fence) errors.push(at(fence.line, "kodeblokken som starter her, slutter aldri."));
  if (subchaptersSection === null) {
    errors.push(`Fant ikke seksjonen «## ${SECTION_SUBCHAPTERS}».`);
  } else if (subchapters.length === 0) {
    errors.push(at(subchaptersSection, `«## ${SECTION_SUBCHAPTERS}» har ingen delkapitler («### n.m Tittel»).`));
  }

  // Har overskriftene feil, sjekkes ikke delkapitlene i tabellen, så de ikke gir følgefeil.
  const ownQuestions = readQuestionBank(bankLines, errors.length === 0 ? new Set(subchapters.map((s) => s.number)) : null, errors);

  if (errors.length > 0 || chapterNumber === null) return { ok: false, errors };

  const sectionText = (name: string) => (sectionLines.get(name) ?? []).join("\n").trim();
  return {
    ok: true,
    value: {
      courseCode,
      chapter: {
        number: chapterNumber,
        title,
        learningGoals: sectionText(SECTION_LEARNING_GOALS),
        keyConcepts: sectionText(SECTION_KEY_CONCEPTS),
        subchapters: subchapters.map(({ number, title: subTitle, lines: body }) => ({
          number,
          title: subTitle,
          noteText: body.join("\n").trim(),
        })),
      },
      ownQuestions,
      lines: { courseCode: emne!.line, chapterNumber: kapittel!.line },
    },
  };
}

const BANK_COLUMNS = ["#", "Delkapittel", "Spørsmål", "Fasit"];
const UNCLEAR_MARKER = /^\*\*Må avklares før bruk:?\*\*:?$/;
const BOLD_BULLET = /^[-*]\s+\*\*(.*?)\*\*/;

function tableCells(text: string): string[] {
  return text
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((c) => c.trim());
}

/**
 * Leser tabellen og listen «Må avklares før bruk» i `## Spørsmålsbank`. Feil legges i `errors`.
 * Gir spørsmålene som skal med, og numrene som er hoppet over.
 */
function readQuestionBank(
  lines: { text: string; line: number }[],
  subchapterNumbers: Set<string> | null,
  errors: string[],
): OwnQuestions {
  const all: OwnQuestion[] = [];
  const firstLine = new Map<number, number>();
  const unclear: { number: number; line: number }[] = [];
  let header = false;
  let inUnclear = false;

  for (const { text, line } of lines) {
    const trimmed = text.trim();
    if (trimmed.startsWith("|")) {
      inUnclear = false;
      const cells = tableCells(trimmed);
      if (!header) {
        header = true;
        if (cells.join("|") !== BANK_COLUMNS.join("|")) {
          const names = BANK_COLUMNS.map((c) => `«${c}»`).join(", ");
          errors.push(at(line, `tabellen i «## ${SECTION_QUESTION_BANK}» må ha kolonnene ${names}.`));
        }
        continue;
      }
      if (cells.every((c) => /^:?-+:?$/.test(c))) continue;
      if (cells.length !== BANK_COLUMNS.length) {
        errors.push(at(line, `raden har ${cells.length} kolonner, men tabellen skal ha ${BANK_COLUMNS.length}.`));
        continue;
      }
      const [nr, sub, question, answer] = cells;
      if (!/^\d+$/.test(nr) || Number(nr) < 1) {
        errors.push(at(line, `«#» må være et helt tall fra 1, men er «${nr}».`));
        continue;
      }
      const number = Number(nr);
      const first = firstLine.get(number);
      if (first !== undefined) {
        errors.push(at(line, `spørsmål ${number} står to ganger (første gang på linje ${first}).`));
        continue;
      }
      firstLine.set(number, line);
      const match = /^(\d+)\.(\d+)$/.exec(sub);
      const subchapter = match ? `${Number(match[1])}.${Number(match[2])}` : sub;
      if (subchapterNumbers && !subchapterNumbers.has(subchapter)) {
        errors.push(at(line, `spørsmål ${number} gjelder delkapittel «${sub}», som ikke finnes i «## ${SECTION_SUBCHAPTERS}».`));
        continue;
      }
      if (question === "" || answer === "") {
        errors.push(at(line, `spørsmål ${number} mangler ${question === "" ? "spørsmål" : "fasit"}.`));
        continue;
      }
      all.push({ number, subchapter, question, answer, line });
      continue;
    }
    if (UNCLEAR_MARKER.test(trimmed)) {
      inUnclear = true;
      continue;
    }
    if (!inUnclear || trimmed === "") continue;
    const bullet = BOLD_BULLET.exec(trimmed);
    if (!bullet) {
      // Listen slutter ved første linje som ikke er et punkt eller en innrykket fortsettelse av et.
      if (!/^[-*]\s/.test(trimmed) && !/^\s+\S/.test(text)) inUnclear = false;
      continue;
    }
    // Delkapittelnumre som «1.2» i den fete starten er ikke spørsmålsnumre.
    for (const nr of bullet[1].replace(/\d+\.\d+/g, "").match(/\d+/g) ?? []) unclear.push({ number: Number(nr), line });
  }

  const skipped = new Set<number>();
  for (const { number, line } of unclear) {
    if (!firstLine.has(number)) {
      errors.push(at(line, `«Må avklares før bruk» nevner spørsmål ${number}, som ikke finnes i tabellen.`));
    } else skipped.add(number);
  }
  return {
    questions: all.filter((q) => !skipped.has(q.number)),
    skipped: [...skipped].sort((a, b) => a - b),
  };
}

/**
 * Sjekker at filen er den importen ba om: `emne` lik emnet i kommandoen og `kapittel` lik
 * nummeret i filnavnet. Meldingene nevner begge verdiene.
 */
export function checkNotesFileTarget(
  file: NotesFile,
  target: { courseCode: string; chapterNumber: number },
): string[] {
  const errors: string[] = [];
  const wanted = normalizeCourseCode(target.courseCode);
  if (file.courseCode !== wanted) {
    errors.push(at(file.lines.courseCode, `emne er ${file.courseCode} i frontmatter, men importen gjelder ${wanted}.`));
  }
  if (file.chapter.number !== target.chapterNumber) {
    errors.push(
      at(
        file.lines.chapterNumber,
        `kapittel er ${file.chapter.number} i frontmatter, men filen er kapittel-${target.chapterNumber}.md.`,
      ),
    );
  }
  return errors;
}
