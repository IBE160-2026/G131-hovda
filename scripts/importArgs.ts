// Tolker argumentene til `npm run import -- --target dev|prod <EMNE> <n>`.
import { normalizeCourseCode } from "../src/domain/course";

export type ImportArgs = { target: "dev" | "prod"; courseCode: string; chapterNumber: number };

export const importUsage = "Bruk: npm run import -- --target dev|prod <EMNE> <n>";

export type ParsedImportArgs = { ok: true; value: ImportArgs } | { ok: false; error: string };

export function parseImportArgs(argv: string[]): ParsedImportArgs {
  let target: string | undefined;
  const positional: string[] = [];

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--target") {
      target = argv[++i];
      if (target === undefined) return { ok: false, error: "--target mangler verdi (dev eller prod)." };
    } else if (arg.startsWith("--target=")) {
      target = arg.slice("--target=".length);
    } else if (arg.startsWith("-")) {
      return { ok: false, error: `Ukjent valg: ${arg}.` };
    } else {
      positional.push(arg);
    }
  }

  if (target === undefined) return { ok: false, error: "Velg miljø med --target dev eller --target prod." };
  if (target !== "dev" && target !== "prod") {
    return { ok: false, error: `--target må være dev eller prod, ikke «${target}».` };
  }
  if (positional.length !== 2) {
    return { ok: false, error: "Oppgi emnekode og kapittelnummer, for eksempel IBE430 1." };
  }

  const courseCode = normalizeCourseCode(positional[0]);
  // Emnekoden blir en del av filstien, så bare bokstaver og tall slipper gjennom.
  if (!/^[\p{L}\p{N}]{1,20}$/u.test(courseCode)) {
    return { ok: false, error: `Emnekoden «${positional[0]}» er ugyldig. Bruk bare bokstaver og tall.` };
  }
  if (!/^\d+$/.test(positional[1]) || Number(positional[1]) < 1) {
    return { ok: false, error: `Kapittelnummeret må være et helt tall fra 1, ikke «${positional[1]}».` };
  }

  return { ok: true, value: { target, courseCode, chapterNumber: Number(positional[1]) } };
}

/** Notatfilen relativt til prosjektroten: `G131-hovda/notater/<EMNE>/kapittel-<n>.md`. */
export function notesFilePath(args: Pick<ImportArgs, "courseCode" | "chapterNumber">): string {
  return `G131-hovda/notater/${args.courseCode}/kapittel-${args.chapterNumber}.md`;
}

/** Bare et eksakt «ja» (uansett store/små bokstaver og mellomrom rundt) godkjenner import til prod. */
export function isConfirmed(answer: string | null): boolean {
  return (answer ?? "").trim().toLowerCase() === "ja";
}
