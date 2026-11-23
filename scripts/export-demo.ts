// `npm run export-demo`: lager demofila `demo-data/demo.json` med IBE430 kapittel 1–4 fra prod (FR-26,
// AD-3). Leser alltid fra prod, uten `--target` og uten bekreftelse, fordi den bare leser. Bare
// delkapitler som er klare og har nok spørsmål (NFR-8), tas med, og utskriften sier hvilke som hoppes
// over. Dataene valideres mot skjemaet før noe skrives. Ved feil avsluttes med kode 1, og `demo-data/`
// endres ikke. Kjøres aldri automatisk.
import { mkdirSync, renameSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { buildDemoData, demoMessages, serializeDemoData, validateDemoData } from "../src/application/demoData";
import { getDataSourceForScript } from "../src/composition/script";

const COURSE_CODE = "IBE430";
const DEMO_FILE = "demo-data/demo.json";

async function main(): Promise<number> {
  if (process.argv.length > 2) {
    console.error("Bruk: npm run export-demo (uten argumenter, leser alltid fra prod).");
    return 1;
  }
  const source = await getDataSourceForScript("prod");
  if (!source.ok) {
    console.error(source.error);
    return 1;
  }
  console.log(`Lager demodata for ${COURSE_CODE} fra prod.`);
  const result = await buildDemoData(source.data, COURSE_CODE);

  const printSkipped = (skipped: { number: string; title: string; reason: string }[]) => {
    if (skipped.length === 0) return;
    console.log(demoMessages.skippedHeading);
    for (const s of skipped) console.log(demoMessages.skipped(s));
  };

  switch (result.status) {
    case "ok": {
      const json = serializeDemoData(result.data);
      // Validerer det som faktisk skrives, før det skrives.
      const validation = validateDemoData(JSON.parse(json));
      if (!validation.ok) {
        console.error(demoMessages.invalid);
        for (const error of validation.errors) console.error(`  ${error}`);
        return 1;
      }
      const file = resolve(process.cwd(), DEMO_FILE);
      mkdirSync(dirname(file), { recursive: true });
      // Skriver til en midlertidig fil og bytter den inn, så en avbrutt skriving ikke ødelegger fila.
      const tmp = `${file}.tmp`;
      writeFileSync(tmp, json, "utf8");
      renameSync(tmp, file);
      printSkipped(result.skipped);
      console.log(demoMessages.written(result.written, DEMO_FILE));
      return 0;
    }
    case "noReadySubchapters":
      printSkipped(result.skipped);
      console.error(demoMessages.noReadySubchapters(COURSE_CODE));
      return 1;
    case "courseNotFound":
      console.error(demoMessages.courseNotFound(result.courseCode));
      return 1;
    case "invalid":
      console.error(demoMessages.invalid);
      for (const error of result.errors) console.error(`  ${error}`);
      return 1;
    case "unavailable":
      console.error(demoMessages.unavailable);
      return 1;
  }
}

main().then(
  (code) => {
    process.exitCode = code;
  },
  (error: unknown) => {
    console.error("Eksporten stoppet med en uventet feil. Ingenting er skrevet:", error);
    process.exitCode = 1;
  },
);
