import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

// Lagreglene fra AD-1: avhengigheter går bare innover.
const adapterImports = {
  group: ["@/adapters", "@/adapters/*", "**/adapters", "**/adapters/*"],
  message: "Importer ikke adaptere direkte. Bruk komposisjonsroten (AD-1).",
};

// Serverkode som verken domene eller applikasjon kan bruke, slik at de kan kjøre i nettleseren (AD-1, AD-3).
const serverOnlyImports = {
  group: [
    "server-only",
    "node:*",
    "fs",
    "fs/*",
    "path",
    "os",
    "crypto",
    "child_process",
    "http",
    "https",
    "net",
    "process",
  ],
  message: "Domene og applikasjon kan ikke bruke serverkode (AD-1).",
};

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "_bmad/**",
    ".claude/**",
    ".logs/**",
    "G131-hovda/**",
  ]),
  {
    files: ["src/domain/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: [
                "@/application",
                "@/application/*",
                "@/adapters",
                "@/adapters/*",
                "@/app",
                "@/app/*",
                "**/application",
                "**/application/*",
                "**/adapters",
                "**/adapters/*",
                "**/app",
                "**/app/*",
              ],
              message: "src/domain kan ikke importere fra andre lag (AD-1).",
            },
            {
              group: [
                "next",
                "next/*",
                "react",
                "react/*",
                "react-dom",
                "react-dom/*",
                "@supabase/*",
                "@anthropic-ai/*",
                "@aws-sdk/*",
              ],
              message:
                "src/domain kan ikke importere rammeverk-, database- eller KI-pakker (AD-1).",
            },
            serverOnlyImports,
          ],
        },
      ],
    },
  },
  {
    files: ["src/application/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: [
                "@/adapters",
                "@/adapters/*",
                "@/app",
                "@/app/*",
                "**/adapters",
                "**/adapters/*",
                "**/app",
                "**/app/*",
                "next",
                "next/*",
              ],
              message:
                "src/application kan bare importere fra src/domain, ikke fra adaptere eller Next.js (AD-1).",
            },
            serverOnlyImports,
          ],
        },
      ],
    },
  },
  {
    files: ["src/app/**/*.{ts,tsx}", "scripts/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": ["error", { patterns: [adapterImports] }],
    },
  },
]);

export default eslintConfig;
