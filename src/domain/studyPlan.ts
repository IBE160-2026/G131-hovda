/**
 * Regler for studieplanen (FR-3 del 2, AD-11, AD-15). Rene funksjoner uten avhengigheter (AD-2).
 *
 * Kalenderdatoer er strenger på formen `ÅÅÅÅ-MM-DD` og regnes som rene datoer, uten klokkeslett.
 * «I dag» kommer alltid fra porten `Clock`, aldri herfra.
 */

export type StudyPlanField = "examDate" | "planStart";

/** Øyeblikksbildet ved planstart. */
export type PlanSnapshot = {
  /** Aktive delkapitler gjennomført før planstart. */
  g0: number;
  /** Aktive delkapitler som ikke er med i G₀. */
  r0: number;
  /** Studiedager fra og med planstart til og med dagen før eksamensdatoen. */
  d: number;
};

export const studyPlanMessages = {
  emptyExamDate: "Skriv inn eksamensdatoen.",
  invalidExamDate: "Skriv inn en gyldig eksamensdato.",
  invalidPlanStart: "Skriv inn en gyldig dato, eller la feltet stå tomt.",
  examNotAfterStart: "Eksamensdatoen må være etter planstart.",
  noStudyDays: "Det er ingen studiedager (mandag–fredag) mellom planstart og eksamen.",
} as const;

const MS_PER_DAY = 86_400_000;
const isoDatePattern = /^(\d{4})-(\d{2})-(\d{2})$/;
const dateParts = { year: "numeric", month: "2-digit", day: "2-digit" } as const;
// `en-CA` gir datoen som `ÅÅÅÅ-MM-DD`.
const utcDateFormat = new Intl.DateTimeFormat("en-CA", { timeZone: "UTC", ...dateParts });
const osloDateFormat = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Oslo", ...dateParts });

/** Dagnummeret siden 1970-01-01, eller `null` når `date` ikke er en gyldig dato. */
function dayNumber(date: string): number | null {
  const match = isoDatePattern.exec(date);
  if (!match) return null;
  const ms = Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  // Datoer som 2026-02-30 ruller over til en annen dag og er ugyldige.
  return utcDateFormat.format(ms) === date ? ms / MS_PER_DAY : null;
}

/** Ukedagen for et dagnummer: søndag = 0, lørdag = 6. 1970-01-01 var en torsdag. */
function weekday(day: number): number {
  return (((day + 4) % 7) + 7) % 7;
}

function isWeekday(day: number): boolean {
  const w = weekday(day);
  return w !== 0 && w !== 6;
}

/** Om `date` er en gyldig kalenderdato på formen `ÅÅÅÅ-MM-DD`. */
export function isValidDate(date: string): boolean {
  return dayNumber(date) !== null;
}

function requireDay(date: string): number {
  const day = dayNumber(date);
  if (day === null) throw new Error(`Ugyldig dato: ${date}`);
  return day;
}

/** Mandag–fredag er studiedager. Lørdag og søndag er fleksible dager. */
export function isStudyDay(date: string): boolean {
  return isWeekday(requireDay(date));
}

/** Antall studiedager fra og med `from` til, men ikke med, `toExclusive`. 0 når `toExclusive` ikke er etter `from`. */
export function studyDaysBetween(from: string, toExclusive: string): number {
  const start = requireDay(from);
  const end = requireDay(toExclusive);
  let count = 0;
  for (let day = start; day < end; day++) {
    if (isWeekday(day)) count++;
  }
  return count;
}

/** Datoen i Europe/Oslo (`ÅÅÅÅ-MM-DD`) for et ISO-tidspunkt, for eksempel `completedAt`. */
export function osloDate(isoTimestamp: string): string {
  const ms = Date.parse(isoTimestamp);
  if (Number.isNaN(ms)) throw new Error(`Ugyldig tidspunkt: ${isoTimestamp}`);
  return osloDateFormat.format(ms);
}

/**
 * Øyeblikksbildet for planen: G₀ er de aktive delkapitlene gjennomført før planstart (Oslo-datoen
 * til `completedAt` er tidligere enn `planStart`), R₀ resten av de aktive, og D studiedagene fra og
 * med planstart til og med dagen før eksamen. Avkrysninger for delkapitler som ikke er aktive, telles ikke.
 */
export function planSnapshot(input: {
  activeSubchapterIds: readonly string[];
  completions: readonly { subchapterId: string; completedAt: string }[];
  planStart: string;
  examDate: string;
}): PlanSnapshot {
  const active = new Set(input.activeSubchapterIds);
  const before = new Set(
    input.completions
      .filter((c) => active.has(c.subchapterId) && osloDate(c.completedAt) < input.planStart)
      .map((c) => c.subchapterId),
  );
  return {
    g0: before.size,
    r0: active.size - before.size,
    d: studyDaysBetween(input.planStart, input.examDate),
  };
}

export type StudyPlanDatesValidation =
  | { ok: true; value: { examDate: string; planStart: string } }
  | { ok: false; errors: Partial<Record<StudyPlanField, string>> };

/**
 * Validerer datoene eieren har skrevet inn. Tom planstart blir `today`. Eksamensdatoen må være
 * etter planstart, og det må finnes minst én studiedag før eksamen.
 */
export function validateStudyPlanDates(
  input: { examDate: string; planStart: string },
  today: string,
): StudyPlanDatesValidation {
  const examDate = input.examDate.trim();
  const planStart = input.planStart.trim() || today;

  const errors: Partial<Record<StudyPlanField, string>> = {};
  if (examDate === "") errors.examDate = studyPlanMessages.emptyExamDate;
  else if (!isValidDate(examDate)) errors.examDate = studyPlanMessages.invalidExamDate;
  if (!isValidDate(planStart)) errors.planStart = studyPlanMessages.invalidPlanStart;
  if (Object.keys(errors).length > 0) return { ok: false, errors };

  if (examDate <= planStart) return { ok: false, errors: { examDate: studyPlanMessages.examNotAfterStart } };
  if (studyDaysBetween(planStart, examDate) < 1) {
    return { ok: false, errors: { examDate: studyPlanMessages.noStudyDays } };
  }
  return { ok: true, value: { examDate, planStart } };
}

const monthNames = [
  "januar",
  "februar",
  "mars",
  "april",
  "mai",
  "juni",
  "juli",
  "august",
  "september",
  "oktober",
  "november",
  "desember",
];

/** «10. desember 2026» for `2026-12-10`. */
export function norwegianDate(date: string): string {
  requireDay(date);
  const [year, month, day] = date.split("-").map(Number);
  return `${day}. ${monthNames[month - 1]} ${year}`;
}
