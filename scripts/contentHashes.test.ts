// Kjører `npm run innhold:hash` mot de ekte filene. Kommandoen leser ingen database.
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const tsx = resolve("node_modules/tsx/dist/cli.mjs");

function run(args: string[]) {
  return spawnSync(process.execPath, [tsx, "scripts/contentHashes.ts", ...args], { encoding: "utf8" });
}

describe("npm run innhold:hash", () => {
  it("skriver én linje per delkapittel med notater, de samme hashene som i innholdsfilen", () => {
    const result = run(["IBE430", "1"]);
    expect(result.status).toBe(0);
    const lines = result.stdout.trim().split("\n");
    expect(lines.map((l) => l.split(" ")[0])).toEqual(["1.1", "1.2", "1.3", "1.4", "1.5", "1.6"]);
    const content = readFileSync("G131-hovda/notater/IBE430/kapittel-1.innhold.md", "utf8");
    const inFile = [...content.matchAll(/^### (\d+\.\d+) [^\r\n]*\r?\n<!-- inputHash: ([0-9a-f]{64}) -->\r?$/gm)].map((m) => `${m[1]} ${m[2]}`);
    expect(lines).toEqual(inFile);
  }, 20000);

  it("viser bruken og gir kode 1 med feil argumenter", () => {
    const result = run(["IBE430"]);
    expect(result.stderr).toContain("Bruk: npm run innhold:hash -- <EMNE> <n>");
    expect(result.status).toBe(1);
  }, 20000);
});
