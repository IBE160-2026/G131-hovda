// Tester mot Supabase-prosjektet dev (`npm run test:dev`). Kjøres ikke i CI, som ikke har nøkler.
// Leser .env.local, som peker på dev. Adaptere testes aldri mot prod.
import { fileURLToPath } from "node:url";
import { loadEnv } from "vite";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    include: ["src/**/*.dev.test.ts"],
    environment: "node",
    env: loadEnv("development", process.cwd(), ""),
    testTimeout: 20_000,
  },
});
