// Demoen når aldri Supabase eller eierens data (NFR-5, NFR-8, AD-3). Testen følger importene fra
// komposisjonsroten for demoen og fra alle filene under src/app/demo/, og feiler hvis en av dem
// når Supabase-adapteren, en Supabase-pakke eller serverroten, også via andre filer.
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const src = resolve(fileURLToPath(new URL("..", import.meta.url)));
const toSrc = (path: string) => relative(src, path).split("\\").join("/");

/** Importene i en fil: `import … from`, `export … from`, `import "…"` og `import("…")`. */
export function importsOf(source: string): string[] {
  const patterns = [
    /\b(?:import|export)\s+(?:type\s+)?[^'"`;]*?\bfrom\s*["']([^"']+)["']/g,
    /\bimport\s*["']([^"']+)["']/g,
    /\bimport\s*\(\s*["']([^"']+)["']\s*\)/g,
    /\brequire\s*\(\s*["']([^"']+)["']\s*\)/g,
  ];
  return patterns.flatMap((pattern) => [...source.matchAll(pattern)].map((m) => m[1]));
}

const extensions = ["", ".ts", ".tsx", "/index.ts", "/index.tsx"];

/** Fila importen peker på, eller `null` for en pakke. */
function resolveImport(from: string, specifier: string): string | null {
  let base: string;
  if (specifier.startsWith("@/")) base = join(src, specifier.slice(2));
  else if (specifier.startsWith(".")) base = resolve(dirname(from), specifier);
  else return null;
  for (const ext of extensions) {
    const path = base + ext;
    if (existsSync(path) && statSync(path).isFile()) return path;
  }
  throw new Error(`Fant ikke ${specifier} fra ${toSrc(from)}`);
}

function isForbidden(specifier: string, path: string | null): boolean {
  if (/^@supabase\//.test(specifier)) return true;
  if (["server-only", "next/headers", "next/server"].includes(specifier)) return true;
  if (/^@\/adapters\/supabase(\/|$)/.test(specifier) || specifier === "@/composition/server") return true;
  if (!path) return false;
  const file = toSrc(path);
  return file.startsWith("adapters/supabase/") || /^composition\/server(\.tsx?)?$/.test(file);
}

/** Importkjedene fra `entry` som når noe demoen ikke kan bruke. Tom liste når den er ren. */
export function forbiddenChains(entry: string): string[] {
  const found: string[] = [];
  const seen = new Set<string>();
  const visit = (file: string, chain: string[]) => {
    if (seen.has(file)) return;
    seen.add(file);
    if (!/\.(ts|tsx)$/.test(file)) return;
    for (const specifier of importsOf(readFileSync(file, "utf8"))) {
      const path = resolveImport(file, specifier);
      const next = [...chain, path ? toSrc(path) : specifier];
      if (isForbidden(specifier, path)) found.push(next.join(" → "));
      else if (path) visit(path, next);
    }
  };
  visit(entry, [toSrc(entry)]);
  return found;
}

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    return /\.(ts|tsx)$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name) ? [path] : [];
  });
}

describe("importsOf", () => {
  it("finner statiske, typede, gjenbrukte og dynamiske importer", () => {
    const source = `import a from "a";
import type { B } from "@/b";
import {
  c,
} from "./c";
export { d } from "../d";
import "e.css";
const f = await import("f");`;
    expect(importsOf(source).sort()).toEqual(["../d", "./c", "@/b", "a", "e.css", "f"].sort());
  });
});

describe("forbiddenChains", () => {
  it("finner Supabase og serverkode fra serverroten, så testen kan feile", () => {
    const chains = forbiddenChains(join(src, "composition/server.ts"));
    expect(chains.some((c) => c.includes("adapters/supabase/"))).toBe(true);
    expect(chains.some((c) => c.endsWith("next/headers"))).toBe(true);
    expect(chains.some((c) => c.endsWith("next/server"))).toBe(true);
  });
});

describe("demoen når ikke Supabase eller serverroten", () => {
  const entries = [join(src, "composition/demo.ts"), ...sourceFiles(join(src, "app/demo"))];

  it("finner sidene i demoen", () => {
    expect(entries.map(toSrc)).toEqual(
      expect.arrayContaining([
        "composition/demo.ts",
        "app/demo/layout.tsx",
        "app/demo/page.tsx",
        "app/demo/emner/[id]/page.tsx",
        "app/demo/emner/[id]/delkapitler/[nummer]/page.tsx",
      ]),
    );
  });

  it.each(entries.map((path) => [toSrc(path), path]))("%s", (_name, path) => {
    expect(forbiddenChains(path)).toEqual([]);
  });
});
