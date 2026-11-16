/**
 * Tolker en notatfil (`notater/<EMNE>/kapittel-<n>.md`) til kapittel, delkapitler og notater
 * (FR-8). Ren funksjon uten avhengigheter (AD-2). Hele filen valideres, og feil gir norsk
 * melding med linjenummer (AD-17).
 *
 * Format: frontmatter (`emne`, `kapittel`, `tittel`) og så `##`-seksjoner. Bare tre seksjoner
 * tas med: `## Læringsmål for kapittelet`, `## Nøkkelbegreper` og `## Fordelt på delkapitler`.
 * Delkapitler er `### n.m Tittel` under `## Fordelt på delkapitler` og slutter ved neste `###`
 * eller `##`. Alt annet (`## Råtekst`, `## Rettelser`, `## Gjennomgangsspørsmål`,
 * `## Spørsmålsbank`, `### Innliming …`) tas aldri med. Overskrifter inne i kodeblokker teller ikke.
 */
import type { ChapterInput, SubchapterInput } from "./chapter";
import { normalizeCourseCode } from "./course";

export const SECTION_LEARNING_GOALS = "Læringsmål for kapittelet";
export const SECTION_KEY_CONCEPTS = "Nøkkelbegreper";
export const SECTION_SUBCHAPTERS = "Fordelt på delkapitler";

export type NotesFile = {
  /** `emne` fra frontmatter, normalisert. */
  courseCode: string;
  chapter: ChapterInput;
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

    if (current?.kind === "section") sectionLines.get(current.name)!.push(line);
    else if (current?.kind === "subchapter") subchapters[current.index].lines.push(line);
  }

  if (fence) errors.push(at(fence.line, "kodeblokken som starter her, slutter aldri."));
  if (subchaptersSection === null) {
    errors.push(`Fant ikke seksjonen «## ${SECTION_SUBCHAPTERS}».`);
  } else if (subchapters.length === 0) {
    errors.push(at(subchaptersSection, `«## ${SECTION_SUBCHAPTERS}» har ingen delkapitler («### n.m Tittel»).`));
  }

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
      lines: { courseCode: emne!.line, chapterNumber: kapittel!.line },
    },
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
