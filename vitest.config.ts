import { fileURLToPath } from "node:url";
import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    include: ["src/**/*.test.ts", "scripts/**/*.test.ts"],
    // Tester mot Supabase-prosjektet dev kjøres bare med `npm run test:dev` (vitest.dev.config.ts).
    exclude: [...configDefaults.exclude, "**/*.dev.test.ts"],
    environment: "node",
  },
});
