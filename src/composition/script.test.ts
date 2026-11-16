// Tester lesingen av .env.<miljø>.local. Feilene kommer før noen klient brukes, så ingen nettverk.
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getDataSourceForScript } from "./script";

describe("getDataSourceForScript", () => {
  let root = "";
  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), "studievenn-script-"));
  });
  afterEach(() => rmSync(root, { recursive: true, force: true }));

  it("sier fra når .env.dev.local mangler", async () => {
    expect(await getDataSourceForScript("dev", root)).toEqual({
      ok: false,
      error: "Fant ikke .env.dev.local. Se README og .env.example.",
    });
  });

  it("sier fra om nøkler som mangler eller bare er mellomrom", async () => {
    writeFileSync(join(root, ".env.dev.local"), "NEXT_PUBLIC_SUPABASE_URL=https://x.supabase.co\nOWNER_EMAIL=\"   \"\n");
    expect(await getDataSourceForScript("dev", root)).toEqual({
      ok: false,
      error: "Mangler SUPABASE_SERVICE_ROLE_KEY, OWNER_EMAIL i .env.dev.local.",
    });
  });
});
