// Komposisjonsroten for demoen (AD-1, AD-3). Kjører i nettleseren og kobler portene til demo- og
// klokkeadapteren. Importerer aldri Supabase-adapteren eller serverroten (NFR-5, NFR-8), og
// `demo.test.ts` sjekker det i CI.
import type { Clock } from "@/application/clock";
import type { DataSource } from "@/application/dataSource";
import { DemoClock } from "@/adapters/clock/demoClock";
import { DemoDataSource } from "@/adapters/demo/dataSource";
import demoFile from "../../demo-data/demo.json";

export type Demo = { data: DataSource; clock: Clock };

/** Demoen med innholdet `input`, som valideres. Ugyldig innhold gir `unavailable` på alle lesinger. */
export function createDemo(input: unknown): Demo {
  return { data: new DemoDataSource(input), clock: new DemoClock() };
}

let demo: Demo | null = null;

/** Datakilden og klokka for demoen med `demo-data/demo.json`. Fila valideres første gang. */
export function getDemo(): Demo {
  demo ??= createDemo(demoFile);
  return demo;
}
