// `npm run import -- --target dev|prod <EMNE> <n>`: legger kapittel, delkapitler og notater fra
// notatfilen inn i databasen (FR-8 uten KI). Idempotent. Hele filen valideres før noe skrives,
// og prod krever bekreftelse. Avslutter med kode 1 ved feil.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createInterface } from "node:readline";
import {
  describeImport,
  importChapter,
  importMessages,
  prepareChapterImport,
} from "../src/application/importChapter";
import { getDataSourceForScript } from "../src/composition/script";
import { importUsage, isConfirmed, notesFilePath, parseImportArgs } from "./importArgs";

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

async function main(): Promise<number> {
  const args = parseImportArgs(process.argv.slice(2));
  if (!args.ok) {
    console.error(args.error);
    console.error(importUsage);
    return 1;
  }
  const { target, courseCode, chapterNumber } = args.value;
  const file = notesFilePath(args.value);

  let text: string;
  try {
    text = readFileSync(resolve(process.cwd(), file), "utf8");
  } catch {
    console.error(`Fant ikke notatfilen ${file}.`);
    return 1;
  }

  const prepared = prepareChapterImport(text, { courseCode, chapterNumber });
  if (prepared.status === "invalid") {
    console.error(`Notatfilen ${file} har feil. Ingenting er skrevet.`);
    for (const error of prepared.errors) console.error(`  ${error}`);
    return 1;
  }

  if (target === "prod") {
    const answer = await ask(`Du importerer ${courseCode} kapittel ${chapterNumber} til prod. Skriv ja for å importere til prod: `);
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
  const result = await importChapter(source.data, text, { courseCode, chapterNumber });
  switch (result.status) {
    case "ok":
      for (const line of describeImport(result.chapter, result.report)) console.log(line);
      return 0;
    case "invalid":
      console.error(`Notatfilen ${file} har feil. Ingenting er skrevet.`);
      for (const error of result.errors) console.error(`  ${error}`);
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
