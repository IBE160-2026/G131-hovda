// Kjører selve kommandoen for prod-bekreftelsen. Avbrytes importen, når den aldri databasen.
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const tsx = resolve("node_modules/tsx/dist/cli.mjs");

function runImport(args: string[], input: string) {
  return spawnSync(process.execPath, [tsx, "scripts/import.ts", ...args], { input, encoding: "utf8" });
}

describe("npm run import mot prod", () => {
  it("spør om bekreftelse og avslutter med kode 1 uten endringer når svaret ikke er ja", () => {
    const result = runImport(["--target", "prod", "IBE430", "1"], "nei\n");
    expect(result.stdout).toContain("Skriv ja for å importere til prod");
    expect(result.stdout).not.toContain("Importerer");
    expect(result.stderr).toContain("Avbrutt. Ingenting er skrevet.");
    expect(result.status).toBe(1);
  }, 20000);

  it("avbryter også når inndata lukkes uten svar", () => {
    const result = runImport(["--target", "prod", "IBE430", "1"], "");
    expect(result.stderr).toContain("Avbrutt. Ingenting er skrevet.");
    expect(result.status).toBe(1);
  }, 20000);
});

describe("npm run import med feil", () => {
  it("viser bruken og avslutter med kode 1 uten --target", () => {
    const result = runImport(["IBE430", "1"], "");
    expect(result.stderr).toContain("Bruk: npm run import -- --target dev|prod <EMNE> <n>");
    expect(result.status).toBe(1);
  }, 20000);

  it("sier fra og avslutter med kode 1 når notatfilen mangler", () => {
    const result = runImport(["--target", "dev", "IBE430", "99"], "");
    expect(result.stderr).toContain("Fant ikke notatfilen");
    expect(result.status).toBe(1);
  }, 20000);
});
