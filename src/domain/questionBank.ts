/**
 * Regler for spørsmålsbanken til et delkapittel (FR-13, AD-6, AD-14). Rene funksjoner uten
 * avhengigheter (AD-2). Banken lages i Claude Code og står under `## Quizspørsmål` i innholdsfilen:
 * en temaliste og 20 flervalgsspørsmål med fire alternativer, nøyaktig ett riktig, en forklaring og
 * ett tema fra listen. Brukerens egne spørsmål fra `## Spørsmålsbank` i notatfilen regnes med i de 20.
 */

export const QUESTIONS_PER_BANK = 20;
export const OPTIONS_PER_QUESTION = 4;
export const MIN_QUESTIONS_PER_THEME = 2;

/** Status på en versjon av spørsmålsbanken (AD-8). Samme verdier som for sammendrag. */
export type QuestionBankStatus = "lages" | "klart" | "feilet";

/** Et spørsmål brukeren har skrevet selv, fra tabellen i `## Spørsmålsbank` i notatfilen. */
export type OwnQuestion = {
  /** Nummeret i kolonnen `#`. */
  number: number;
  /** «n.m». */
  subchapter: string;
  question: string;
  /** Brukerens fasit, som alltid er det riktige alternativet (AD-6). */
  answer: string;
  line: number;
};

/** Brukerens egne spørsmål som skal med, og numrene som er hoppet over («Må avklares før bruk»). */
export type OwnQuestions = { questions: OwnQuestion[]; skipped: number[] };

export const noOwnQuestions: OwnQuestions = { questions: [], skipped: [] };

export type QuizQuestionInput = {
  question: string;
  /** Fire alternativer i filens rekkefølge. */
  options: string[];
  /** Indeksen (0–3) til det riktige alternativet. */
  correctIndex: number;
  explanation: string;
  theme: string;
  /** Nummeret i `## Spørsmålsbank` når spørsmålet er brukerens eget, ellers `null`. */
  source: number | null;
  /** Originalteksten når et Ja/Nei-spørsmål er skrevet om til flervalg, ellers `null`. */
  original: string | null;
  /** Linjenummeret til `####`-overskriften, for feilmeldinger. */
  line: number;
};

export type ContentQuestionBank = {
  number: string;
  inputHash: string;
  themes: string[];
  questions: QuizQuestionInput[];
  /** Linjenummeret til `###`-overskriften, for feilmeldinger. */
  line: number;
};

const at = (line: number, message: string) => `Linje ${line}: ${message}`;

/** Slår sammen mellomrom og fjerner punktum på slutten, uten hensyn til store og små bokstaver. */
function normalizeAnswer(text: string): string {
  return text.replace(/\s+/gu, " ").trim().replace(/\.+$/u, "").trim().toLowerCase();
}

/** Om et alternativ er det samme som brukerens fasit. */
export function sameAnswer(option: string, answer: string): boolean {
  return normalizeAnswer(option) === normalizeAnswer(answer);
}

/** En fasit som bare er «Ja» eller «Nei» betyr at spørsmålet må skrives om til flervalg. */
export function isYesNoAnswer(answer: string): boolean {
  const normalized = normalizeAnswer(answer).replace(/[!]+$/u, "");
  return normalized === "ja" || normalized === "nei";
}

const OPTION = /^-\s+\[( |x|X)\]\s*(.*)$/;
const FIELD = /^(Forklaring|Tema|Kilde|Original):\s*(.*)$/;
const SOURCE = /^spørsmålsbank\s+(\d+)$/i;
const HASH_COMMENT = /^<!--\s*inputHash:\s*(.*?)\s*-->$/;
const THEMES_LINE = /^Temaer:\s*$/;
const QUESTION_HEADING = /^####\s+(.*)$/;

type Line = { text: string; line: number };

type QuestionDraft = {
  heading: string;
  line: number;
  options: { text: string; correct: boolean }[];
  fields: Map<string, { value: string; line: number }>;
};

/**
 * Tolker teksten under `### n.m Tittel` i `## Quizspørsmål`: hash-kommentaren, `Temaer:` med én
 * `- navn` per linje og så ett `#### Spørsmål` per spørsmål. Sjekker formen, ikke reglene.
 */
export function parseQuestionBankBody(
  number: string,
  headingLine: number,
  body: Line[],
): { ok: true; value: ContentQuestionBank } | { ok: false; errors: string[] } {
  const errors: string[] = [];
  const start = body.findIndex((l) => l.text.trim() !== "");
  const hashLine = start >= 0 ? body[start] : null;
  const hashMatch = hashLine ? HASH_COMMENT.exec(hashLine.text.trim()) : null;
  if (!hashLine || !hashMatch) {
    return {
      ok: false,
      errors: [at(hashLine?.line ?? headingLine, `delkapittel ${number} mangler «<!-- inputHash: … -->» rett under overskriften.`)],
    };
  }
  const inputHash = hashMatch[1];
  if (!/^[0-9a-f]{64}$/.test(inputHash)) {
    errors.push(at(hashLine.line, `inputHash for ${number} må være 64 hex-tegn (0–9, a–f), men er «${inputHash}».`));
  }

  const themes: { name: string; line: number }[] = [];
  let themesLine: number | null = null;
  let inThemes = false;
  const drafts: QuestionDraft[] = [];
  let current: QuestionDraft | null = null;

  for (const { text, line } of body.slice(start + 1)) {
    const trimmed = text.trim();
    if (trimmed === "") {
      inThemes = false;
      continue;
    }
    const heading = QUESTION_HEADING.exec(trimmed);
    if (heading) {
      inThemes = false;
      current = { heading: heading[1].trim(), line, options: [], fields: new Map() };
      drafts.push(current);
      continue;
    }
    if (!current) {
      if (THEMES_LINE.test(trimmed)) {
        if (themesLine !== null) errors.push(at(line, `«Temaer:» står to ganger for ${number} (første gang på linje ${themesLine}).`));
        else themesLine = line;
        inThemes = true;
        continue;
      }
      const bullet = /^-\s+(.*)$/.exec(trimmed);
      if (inThemes && bullet) {
        themes.push({ name: bullet[1].trim(), line });
        continue;
      }
      errors.push(at(line, `«${trimmed}» er ukjent her. Før første spørsmål står bare «Temaer:» med én «- tema» per linje.`));
      continue;
    }
    const option = OPTION.exec(trimmed);
    if (option) {
      current.options.push({ text: option[2].trim(), correct: option[1] !== " " });
      continue;
    }
    const field = FIELD.exec(trimmed);
    if (field) {
      if (current.fields.has(field[1])) errors.push(at(line, `«${field[1]}:» står to ganger i samme spørsmål.`));
      else current.fields.set(field[1], { value: field[2].trim(), line });
      continue;
    }
    errors.push(
      at(line, `«${trimmed}» er ukjent i et spørsmål. Bruk «- [ ]», «- [x]», «Forklaring:», «Tema:», «Kilde:» eller «Original:».`),
    );
  }

  if (themesLine === null) errors.push(at(headingLine, `delkapittel ${number} mangler «Temaer:» før spørsmålene.`));
  const seenThemes = new Map<string, number>();
  for (const theme of themes) {
    if (theme.name === "") errors.push(at(theme.line, "temaet er tomt."));
    else if (seenThemes.has(theme.name)) {
      errors.push(at(theme.line, `temaet «${theme.name}» står to ganger (første gang på linje ${seenThemes.get(theme.name)}).`));
    } else seenThemes.set(theme.name, theme.line);
  }

  const questions: QuizQuestionInput[] = [];
  for (const draft of drafts) {
    const where = (message: string) => at(draft.line, `«${draft.heading}»: ${message}`);
    if (draft.heading === "") errors.push(at(draft.line, "spørsmålet mangler tekst etter «####»."));
    if (draft.options.length !== OPTIONS_PER_QUESTION) {
      errors.push(where(`har ${draft.options.length} alternativer, men skal ha ${OPTIONS_PER_QUESTION}.`));
    }
    const correct = draft.options.filter((o) => o.correct).length;
    if (correct !== 1) errors.push(where(`har ${correct} riktige alternativer, men skal ha nøyaktig ett.`));
    if (draft.options.some((o) => o.text === "")) errors.push(where("et alternativ er tomt."));
    else if (new Set(draft.options.map((o) => normalizeAnswer(o.text))).size !== draft.options.length) {
      errors.push(where("to alternativer er like."));
    }
    const explanation = draft.fields.get("Forklaring")?.value ?? "";
    if (explanation === "") errors.push(where("mangler «Forklaring:»."));
    const theme = draft.fields.get("Tema")?.value ?? "";
    if (theme === "") errors.push(where("mangler «Tema:»."));
    else if (themesLine !== null && !seenThemes.has(theme)) errors.push(where(`temaet «${theme}» står ikke i temalisten.`));
    let source: number | null = null;
    const kilde = draft.fields.get("Kilde");
    if (kilde) {
      const match = SOURCE.exec(kilde.value);
      if (!match) errors.push(at(kilde.line, `«Kilde: ${kilde.value}» må være «Kilde: spørsmålsbank <nr>».`));
      else source = Number(match[1]);
    }
    const original = draft.fields.get("Original")?.value ?? null;
    if (original === "") errors.push(where("«Original:» er tom."));
    questions.push({
      question: draft.heading,
      options: draft.options.map((o) => o.text),
      correctIndex: draft.options.findIndex((o) => o.correct),
      explanation,
      theme,
      source,
      original: original === "" ? null : original,
      line: draft.line,
    });
  }

  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, value: { number, inputHash, themes: themes.map((t) => t.name), questions, line: headingLine } };
}

/**
 * Sjekker reglene for en tolket bank: 20 spørsmål, minst 2 per tema, ingen like spørsmål, og
 * brukerens egne spørsmål for delkapittelet nøyaktig én gang med fasiten som riktig alternativ.
 * Et Ja/Nei-spørsmål er skrevet om og må ha originalteksten i `Original:`.
 */
export function validateQuestionBank(bank: ContentQuestionBank, own: OwnQuestions): string[] {
  const errors: string[] = [];
  const { number } = bank;
  if (bank.questions.length !== QUESTIONS_PER_BANK) {
    errors.push(at(bank.line, `delkapittel ${number} har ${bank.questions.length} spørsmål, men skal ha ${QUESTIONS_PER_BANK}.`));
  }

  const perTheme = new Map(bank.themes.map((t) => [t, 0]));
  for (const q of bank.questions) perTheme.set(q.theme, (perTheme.get(q.theme) ?? 0) + 1);
  for (const theme of bank.themes) {
    const count = perTheme.get(theme) ?? 0;
    if (count < MIN_QUESTIONS_PER_THEME) {
      errors.push(
        at(bank.line, `temaet «${theme}» i ${number} har ${count} spørsmål, men skal ha minst ${MIN_QUESTIONS_PER_THEME}.`),
      );
    }
  }

  const seen = new Map<string, number>();
  for (const q of bank.questions) {
    const key = normalizeAnswer(q.question);
    const first = seen.get(key);
    if (first !== undefined) errors.push(at(q.line, `spørsmålet står to ganger i ${number} (første gang på linje ${first}).`));
    else seen.set(key, q.line);
  }

  const skipped = new Set(own.skipped);
  const ownByNumber = new Map(own.questions.map((q) => [q.number, q]));
  const used = new Map<number, number>();
  for (const q of bank.questions) {
    if (q.source === null) {
      if (q.original !== null) errors.push(at(q.line, "«Original:» brukes bare for brukerens egne spørsmål («Kilde:»)."));
      continue;
    }
    if (skipped.has(q.source)) {
      errors.push(at(q.line, `spørsmål ${q.source} i «## Spørsmålsbank» skal avklares før bruk og kan ikke være med.`));
      continue;
    }
    const mine = ownByNumber.get(q.source);
    if (!mine) {
      errors.push(at(q.line, `spørsmål ${q.source} finnes ikke i «## Spørsmålsbank» i notatfilen.`));
      continue;
    }
    if (mine.subchapter !== number) {
      errors.push(at(q.line, `spørsmål ${q.source} i «## Spørsmålsbank» hører til ${mine.subchapter}, ikke ${number}.`));
      continue;
    }
    const first = used.get(q.source);
    if (first !== undefined) {
      errors.push(at(q.line, `spørsmål ${q.source} fra «## Spørsmålsbank» står to ganger (første gang på linje ${first}).`));
      continue;
    }
    used.set(q.source, q.line);
    if (isYesNoAnswer(mine.answer)) {
      if (q.original === null) {
        errors.push(at(q.line, `spørsmål ${q.source} har fasit «${mine.answer}» og må skrives om, med originalteksten i «Original:».`));
      } else if (normalizeAnswer(q.original) !== normalizeAnswer(mine.question)) {
        errors.push(at(q.line, `«Original:» for spørsmål ${q.source} er ikke lik spørsmålet i «## Spørsmålsbank».`));
      }
      continue;
    }
    if (q.original !== null) {
      errors.push(at(q.line, `spørsmål ${q.source} har ikke fasit Ja eller Nei, så det skal ikke skrives om («Original:»).`));
    }
    if (normalizeAnswer(q.question) !== normalizeAnswer(mine.question)) {
      errors.push(at(q.line, `spørsmål ${q.source} må ha samme tekst som i «## Spørsmålsbank».`));
    }
    const correct = q.options[q.correctIndex];
    if (correct === undefined || !sameAnswer(correct, mine.answer)) {
      errors.push(at(q.line, `det riktige alternativet for spørsmål ${q.source} må være brukerens fasit: «${mine.answer}».`));
    }
  }
  for (const mine of own.questions) {
    if (mine.subchapter === number && !used.has(mine.number)) {
      errors.push(at(bank.line, `spørsmål ${mine.number} fra «## Spørsmålsbank» mangler i ${number} (merk det med «Kilde: spørsmålsbank ${mine.number}»).`));
    }
  }
  return errors;
}

/**
 * Teksten som hashes til `contentHash`: temaene og spørsmålene i filens rekkefølge, uten
 * linjenumre. Lik tekst betyr at banken i filen er den samme som den lagrede.
 */
export function questionBankContentSource(bank: Pick<ContentQuestionBank, "themes" | "questions">): string {
  return JSON.stringify([
    bank.themes,
    bank.questions.map((q) => [q.question, q.options, q.correctIndex, q.explanation, q.theme, q.source, q.original]),
  ]);
}
