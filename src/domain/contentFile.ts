/**
 * Tolker og validerer en innholdsfil (`notater/<EMNE>/kapittel-<n>.innhold.md`) med sammendrag
 * laget på forhånd i Claude Code (FR-11, AD-4). Ren funksjon uten avhengigheter (AD-2). Hele filen
 * valideres mot notatfilens delkapitler før noe skrives, og feil gir norsk melding med
 * linjenummer (AD-17).
 *
 * Format: frontmatter (`emne`, `kapittel`, `instruksjon`, `modell`) og så `## Sammendrag` med ett
 * `### n.m Tittel` per delkapittel. Første linje med innhold under overskriften er
 * `<!-- inputHash: <64 hex-tegn> -->`, og resten er sammendraget. Nummeret er nøkkelen, tittelen
 * trenger ikke stemme med notatfilen (AD-5). Overskrifter inne i kodeblokker teller ikke.
 */
import type { ChapterInput } from "./chapter";
import { normalizeCourseCode } from "./course";
import { hasNotes } from "./hasNotes";
import { validateSummaryText } from "./summary";

/** Instruksjonsversjonen importen kjenner. Står det noe annet i filen, er alt innholdet utdatert. */
export const CONTENT_INSTRUCTION_VERSION = "innhold.v1";

export const SECTION_SUMMARIES = "Sammendrag";

export type ContentSummary = {
  number: string;
  inputHash: string;
  text: string;
  /** Linjenummeret til `###`-overskriften, for feilmeldinger. */
  line: number;
};

export type ContentFile = {
  courseCode: string;
  chapterNumber: number;
  /** `instruksjon` fra frontmatter, lagres som `prompt_version`. */
  instruction: string;
  /** `modell` fra frontmatter, lagres som `model_id`. */
  model: string;
  summaries: ContentSummary[];
};

export type ContentFileResult = { ok: true; value: ContentFile } | { ok: false; errors: string[] };

const at = (line: number, message: string) => `Linje ${line}: ${message}`;

const HASH_COMMENT = /^<!--\s*inputHash:\s*(.*?)\s*-->$/;
const SUBCHAPTER_HEADING = /^(\d+)\.(\d+)(?:\s+\S.*)?$/;

function unquote(value: string): string {
  const v = value.trim();
  if (v.length >= 2 && ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'")))) {
    return v.slice(1, -1).trim();
  }
  return v;
}

type Entry = { number: string; line: number; body: { text: string; line: number }[] };

/**
 * Tolker hele innholdsfilen og sjekker den mot notatfilens kapittel og emnet importen gjelder.
 * Gir alle feilene på en gang, med linjenummer.
 */
export function parseContentFile(
  text: string,
  notes: ChapterInput,
  target: { courseCode: string; chapterNumber: number },
): ContentFileResult {
  const lines = text.replace(/^﻿/, "").split(/\r?\n/);
  const errors: string[] = [];

  if (lines[0]?.trim() !== "---") {
    return { ok: false, errors: [at(1, "filen må starte med frontmatter mellom to linjer med «---».")] };
  }
  const end = lines.findIndex((line, i) => i > 0 && line.trim() === "---");
  if (end < 0) {
    return { ok: false, errors: [at(1, "frontmatter slutter aldri. Avslutt den med en linje med «---».")] };
  }
  const front = new Map<string, { value: string; line: number }>();
  for (let i = 1; i < end; i++) {
    const match = /^([A-Za-z_][\w-]*)\s*:(.*)$/.exec(lines[i]);
    if (match && !front.has(match[1])) front.set(match[1], { value: unquote(match[2]), line: i + 1 });
  }
  const endLine = end + 1;
  const required = (key: string) => {
    const entry = front.get(key);
    if (!entry || entry.value === "") errors.push(at(entry?.line ?? endLine, `frontmatter mangler «${key}».`));
    return entry?.value ?? "";
  };

  const emne = required("emne");
  const kapittel = required("kapittel");
  const instruction = required("instruksjon");
  const model = required("modell");

  const wantedCourse = normalizeCourseCode(target.courseCode);
  const courseCode = normalizeCourseCode(emne);
  if (emne !== "" && courseCode !== wantedCourse) {
    errors.push(at(front.get("emne")!.line, `emne er ${courseCode} i innholdsfilen, men importen gjelder ${wantedCourse}.`));
  }
  let chapterNumber = target.chapterNumber;
  if (kapittel !== "") {
    const line = front.get("kapittel")!.line;
    if (!/^\d+$/.test(kapittel) || Number(kapittel) < 1) {
      errors.push(at(line, `«kapittel» må være et helt tall fra 1, men er «${kapittel}».`));
    } else if (Number(kapittel) !== target.chapterNumber) {
      chapterNumber = Number(kapittel);
      errors.push(
        at(line, `kapittel er ${kapittel} i innholdsfilen, men filen er kapittel-${target.chapterNumber}.innhold.md.`),
      );
    }
  }

  const entries: Entry[] = [];
  const firstLine = new Map<string, number>();
  let summariesSection: number | null = null;
  let inSummaries = false;
  let current: Entry | null = null;
  let fence: { marker: string; line: number } | null = null;

  for (let i = end + 1; i < lines.length; i++) {
    const line = lines[i];
    const lineNo = i + 1;

    const fenceMatch = /^\s{0,3}(`{3,}|~{3,})/.exec(line);
    if (fenceMatch) {
      const marker = fenceMatch[1][0];
      if (!fence) fence = { marker, line: lineNo };
      else if (fence.marker === marker) fence = null;
    } else if (!fence) {
      const h1 = /^#\s+(.*)$/.exec(line);
      const h2 = /^##\s+(.*)$/.exec(line);
      const h3 = /^###\s+(.*)$/.exec(line);
      if (h1 || h2) {
        current = null;
        const name = (h1 ?? h2)![1].trim();
        if (h2 && name === SECTION_SUMMARIES) {
          if (summariesSection !== null) {
            errors.push(at(lineNo, `seksjonen «## ${name}» står to ganger (første gang på linje ${summariesSection}).`));
            inSummaries = false;
          } else {
            summariesSection = lineNo;
            inSummaries = true;
          }
        } else {
          inSummaries = false;
          errors.push(
            at(lineNo, `«${h1 ? "#" : "##"} ${name}» er ikke en kjent seksjon. Bruk «## ${SECTION_SUMMARIES}».`),
          );
        }
        continue;
      }
      if (h3) {
        // Teksten under en avvist overskrift samles her og kastes, så den ikke gir følgefeil.
        current = { number: "", line: lineNo, body: [] };
        const heading = h3[1].trim();
        if (!inSummaries) {
          errors.push(at(lineNo, `«### ${heading}» står utenfor «## ${SECTION_SUMMARIES}».`));
          continue;
        }
        const match = SUBCHAPTER_HEADING.exec(heading);
        if (!match) {
          errors.push(at(lineNo, `«### ${heading}» er ikke et delkapittel. Skriv «### n.m Tittel».`));
          continue;
        }
        const number = `${Number(match[1])}.${Number(match[2])}`;
        const first = firstLine.get(number);
        if (first !== undefined) {
          errors.push(at(lineNo, `delkapittel ${number} står to ganger (første gang på linje ${first}).`));
          continue;
        }
        firstLine.set(number, lineNo);
        current = { number, line: lineNo, body: [] };
        entries.push(current);
        continue;
      }
    }

    if (current) current.body.push({ text: line, line: lineNo });
    else if (inSummaries && line.trim() !== "") {
      errors.push(at(lineNo, `tekst under «## ${SECTION_SUMMARIES}» må stå under et delkapittel («### n.m Tittel»).`));
    }
  }

  if (fence) errors.push(at(fence.line, "kodeblokken som starter her, slutter aldri."));

  const notesByNumber = new Map(notes.subchapters.map((s) => [s.number, s]));
  const summaries: ContentSummary[] = [];
  for (const entry of entries) {
    const sub = notesByNumber.get(entry.number);
    if (!sub) {
      errors.push(at(entry.line, `delkapittel ${entry.number} finnes ikke i notatfilen for kapittel ${chapterNumber}.`));
      continue;
    }
    if (!hasNotes(sub.noteText)) {
      errors.push(at(entry.line, `delkapittel ${entry.number} har ingen notater, så det kan ikke ha sammendrag.`));
      continue;
    }
    const start = entry.body.findIndex((l) => l.text.trim() !== "");
    const hashLine = start >= 0 ? entry.body[start] : null;
    const hashMatch = hashLine ? HASH_COMMENT.exec(hashLine.text.trim()) : null;
    if (!hashLine || !hashMatch) {
      errors.push(
        at(hashLine?.line ?? entry.line, `delkapittel ${entry.number} mangler «<!-- inputHash: … -->» rett under overskriften.`),
      );
      continue;
    }
    const inputHash = hashMatch[1];
    if (!/^[0-9a-f]{64}$/.test(inputHash)) {
      errors.push(at(hashLine.line, `inputHash for ${entry.number} må være 64 hex-tegn (0–9, a–f), men er «${inputHash}».`));
      continue;
    }
    const valid = validateSummaryText(
      entry.body
        .slice(start + 1)
        .map((l) => l.text)
        .join("\n"),
    );
    if (!valid.ok) {
      errors.push(at(entry.line, `delkapittel ${entry.number}: ${valid.reason}`));
      continue;
    }
    summaries.push({ number: entry.number, inputHash, text: valid.text, line: entry.line });
  }

  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, value: { courseCode, chapterNumber, instruction, model, summaries } };
}
