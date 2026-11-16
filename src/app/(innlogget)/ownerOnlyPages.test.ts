// Hver side i (innlogget) må pakke innholdet i `OwnerOnly`. Ellers havner innholdet i den
// statiske delen av siden som alle får (se layout.tsx). Testen feiler for en ny side uten.
// Filnavnet er ikke ownerOnly.test.ts, fordi det kolliderer med OwnerOnly.test.ts på Windows.
import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const root = fileURLToPath(new URL(".", import.meta.url));

function findPages(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return findPages(path);
    return entry.name === "page.tsx" ? [path] : [];
  });
}

export function usesOwnerOnly(source: string): boolean {
  const imported = /import\s*\{[^}]*\bOwnerOnly\b[^}]*\}\s*from\s*["'][./]*OwnerOnly["']/.test(source);
  const wrapped = /<OwnerOnly>[\s\S]*<\/OwnerOnly>/.test(source);
  return imported && wrapped;
}

describe("usesOwnerOnly", () => {
  it("godtar en side som pakker innholdet i OwnerOnly", () => {
    const page = `import { OwnerOnly } from "../OwnerOnly";
export default function Page() { return <OwnerOnly><main>Hei</main></OwnerOnly>; }`;
    expect(usesOwnerOnly(page)).toBe(true);
  });

  it("avviser en side uten OwnerOnly", () => {
    expect(usesOwnerOnly(`export default function Page() { return <main>Hei</main>; }`)).toBe(false);
  });

  it("avviser en side som importerer OwnerOnly uten å bruke den", () => {
    const page = `import { OwnerOnly } from "../OwnerOnly";
export default function Page() { return <main>Hei</main>; }`;
    expect(usesOwnerOnly(page)).toBe(false);
  });
});

describe("sidene i (innlogget)", () => {
  const pages = findPages(root);

  it("finner sidene", () => {
    expect(pages.length).toBeGreaterThan(0);
  });

  it.each(pages.map((path) => [relative(root, path), path]))("%s bruker OwnerOnly", (_name, path) => {
    expect(usesOwnerOnly(readFileSync(path, "utf8"))).toBe(true);
  });
});
