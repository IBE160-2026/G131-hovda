// `npm run innhold:hash -- <EMNE> <n>`: skriver `n.m <inputHash>` for hvert delkapittel med notater
// i notatfilen, med instruksjonsversjonen importen kjenner. Hashene limes inn i innholdsfilen når
// innholdet lages i Claude Code. Leser ingen database og trenger ingen nøkler.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { contentHashes } from "../src/application/summaryHash";
import { notesFilePath, parseCourseChapter } from "./importArgs";

const contentHashesUsage = "Bruk: npm run innhold:hash -- <EMNE> <n>";

async function main(): Promise<number> {
  const args = parseCourseChapter(process.argv.slice(2));
  if (!args.ok) {
    console.error(args.error);
    console.error(contentHashesUsage);
    return 1;
  }
  const file = notesFilePath(args.value);
  let text: string;
  try {
    text = readFileSync(resolve(process.cwd(), file), "utf8");
  } catch {
    console.error(`Fant ikke notatfilen ${file}.`);
    return 1;
  }
  const result = await contentHashes(text, args.value);
  if (!result.ok) {
    console.error(`Notatfilen ${file} har feil.`);
    for (const error of result.errors) console.error(`  ${error}`);
    return 1;
  }
  for (const { number, inputHash } of result.hashes) console.log(`${number} ${inputHash}`);
  return 0;
}

main().then(
  (code) => {
    process.exitCode = code;
  },
  (error: unknown) => {
    console.error("Kommandoen stoppet med en uventet feil:", error);
    process.exitCode = 1;
  },
);
