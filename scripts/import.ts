// `npm run import -- --target dev|prod [--force <n.m>] <EMNE> <n>`: legger kapittel, delkapitler og
// notater fra notatfilen inn i databasen (FR-8) og sammendragene og spørsmålsbankene fra innholdsfilen
// `kapittel-<n>.innhold.md` (FR-11, FR-13). Innholdet er laget på forhånd i Claude Code, og importen
// kaller aldri en KI-leverandør (AD-7). Idempotent: uendret innhold gir ingen nye versjoner. Begge
// filene valideres før noe skrives og før bekreftelsen mot prod. Avslutter med kode 1 ved feil, også
// når innhold er utdatert eller en klar spørsmålsbank er endret. Mangler innholdsfilen, lagres
// kapitlene, og alt «mangler innhold». Spørsmål i `## Spørsmålsbank` som skal avklares før bruk,
// hoppes over, og utskriften sier hvilke.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createInterface } from "node:readline";
import {
  importChapter,
  importMessages,
  prepareChapterImport,
  reportImport,
  type InvalidImport,
} from "../src/application/importChapter";
import { getDataSourceForScript } from "../src/composition/script";
import { contentFilePath, importUsage, isConfirmed, notesFilePath, parseImportArgs } from "./importArgs";

/** Spør i terminalen. Gir `null` hvis inndata lukkes uten svar. */
function ask(question: string): Promise<string | null> {
  return new Promise((done) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    let answered = false;
    rl.on("close", () => {
      if (!answered) done(null);
    });
    rl.question(question, (answer) => {
      answered = true;
      rl.close();
      done(answer);
    });
  });
}

/** Leser innholdsfilen. `null` når den ikke finnes, `undefined` når den finnes, men ikke kan leses. */
function readContentFile(path: string): string | null | undefined {
  try {
    return readFileSync(path, "utf8");
  } catch (error) {
    return (error as NodeJS.ErrnoException).code === "ENOENT" ? null : undefined;
  }
}

async function main(): Promise<number> {
  const args = parseImportArgs(process.argv.slice(2));
  if (!args.ok) {
    console.error(args.error);
    console.error(importUsage);
    return 1;
  }
  const { target, courseCode, chapterNumber, force } = args.value;
  const file = notesFilePath(args.value);
  const contentFile = contentFilePath(args.value);

  let text: string;
  try {
    text = readFileSync(resolve(process.cwd(), file), "utf8");
  } catch {
    console.error(`Fant ikke notatfilen ${file}.`);
    return 1;
  }
  const content = readContentFile(resolve(process.cwd(), contentFile));
  if (content === undefined) {
    console.error(`Fikk ikke lest innholdsfilen ${contentFile}.`);
    return 1;
  }
  if (content === null) console.log(`Fant ikke innholdsfilen ${contentFile}. Delkapitlene får «mangler innhold».`);

  const printInvalid = (invalid: InvalidImport) => {
    const name = invalid.file === "notes" ? `Notatfilen ${file}` : `Innholdsfilen ${contentFile}`;
    console.error(`${name} har feil. Ingenting er skrevet.`);
    for (const error of invalid.errors) console.error(`  ${error}`);
  };

  const chapterTarget = { courseCode, chapterNumber };
  const options = { content, force };
  const prepared = prepareChapterImport(text, chapterTarget, options);
  if (prepared.status === "invalid") {
    printInvalid(prepared);
    return 1;
  }

  if (target === "prod") {
    const answer = await ask(
      `Du importerer ${courseCode} kapittel ${chapterNumber} til prod. Skriv ja for å importere til prod: `,
    );
    if (!isConfirmed(answer)) {
      console.error("Avbrutt. Ingenting er skrevet.");
      return 1;
    }
  }

  const source = await getDataSourceForScript(target);
  if (!source.ok) {
    console.error(source.error);
    return 1;
  }
  console.log(`Importerer ${courseCode} kapittel ${chapterNumber} til ${target}.`);
  const result = await importChapter(source.data, text, chapterTarget, options);
  switch (result.status) {
    case "ok": {
      const report = reportImport(result);
      for (const line of report.stdout) console.log(line);
      for (const line of report.stderr) console.error(line);
      return report.code;
    }
    case "invalid":
      printInvalid(result);
      return 1;
    case "courseNotFound":
      console.error(importMessages.courseNotFound(result.courseCode));
      return 1;
    case "unavailable":
      console.error(importMessages.unavailable);
      return 1;
  }
}

main().then(
  (code) => {
    process.exitCode = code;
  },
  (error: unknown) => {
    console.error("Importen stoppet med en uventet feil:", error);
    process.exitCode = 1;
  },
);
