// Tester lesingen av .env.<miljø>.local. Feilene kommer før noen klient brukes, så ingen nettverk.
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getAiProviderForScript, getDataSourceForScript } from "./script";

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

describe("getAiProviderForScript", () => {
  let root = "";
  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), "studievenn-script-"));
  });
  afterEach(() => rmSync(root, { recursive: true, force: true }));

  it("sier at sammendrag ikke er laget når AWS-nøklene mangler", () => {
    writeFileSync(join(root, ".env.dev.local"), "OWNER_EMAIL=eier@example.com\nAWS_ACCESS_KEY_ID=\n");
    expect(getAiProviderForScript("dev", root)).toEqual({
      ok: false,
      error: "Mangler AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY i .env.dev.local. Sammendrag er ikke laget.",
    });
  });

  it("lager KI-modulen uten å kalle KI når nøklene finnes", () => {
    writeFileSync(join(root, ".env.prod.local"), "AWS_ACCESS_KEY_ID=AKIATEST\nAWS_SECRET_ACCESS_KEY=hemmelig\n");
    const result = getAiProviderForScript("prod", root);
    expect(result.ok && result.ai.summaryPromptVersion).toBe("summary.v1");
  });
});
