// Kjører selve kommandoen `npm run export-demo`. Testene når aldri prod: den ene stopper på
// argumentene, den andre kjører i en tom mappe uten `.env.prod.local`.
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

const tsx = resolve("node_modules/tsx/dist/cli.mjs");
const script = resolve("scripts/export-demo.ts");
const tsconfig = resolve("tsconfig.json");

function runExport(args: string[], cwd?: string) {
  return spawnSync(process.execPath, [tsx, script, ...args], {
    cwd,
    encoding: "utf8",
    // Så tsx finner `@/`-stiene også når kommandoen kjører i en annen mappe.
    env: { ...process.env, TSX_TSCONFIG_PATH: tsconfig },
  });
}

describe("npm run export-demo", () => {
  it("viser bruken og gir kode 1 med et argument", () => {
    const result = runExport(["--target", "dev"]);
    expect(result.stderr).toContain("Bruk: npm run export-demo");
    expect(result.stdout).not.toContain("Lager demodata");
    expect(result.status).toBe(1);
  }, 20000);

  it("gir kode 1 og skriver ingen fil uten .env.prod.local", () => {
    const dir = mkdtempSync(join(tmpdir(), "export-demo-"));
    try {
      const result = runExport([], dir);
      expect(result.stderr).toContain("Fant ikke .env.prod.local");
      expect(result.status).toBe(1);
      expect(existsSync(join(dir, "demo-data", "demo.json"))).toBe(false);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  }, 20000);
});
