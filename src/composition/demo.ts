// Komposisjonsroten for demoen (AD-1, AD-3). Kjører i nettleseren og kobler portene til demo- og
// klokkeadapteren. Importerer aldri Supabase-adapteren eller serverroten (NFR-5, NFR-8), og
// `demo.test.ts` sjekker det i CI.
import type { Clock } from "@/application/clock";
import type { DataSource } from "@/application/dataSource";
import { DemoClock } from "@/adapters/clock/demoClock";
import { DemoDataSource, type DemoStorage } from "@/adapters/demo/dataSource";
import demoFile from "../../demo-data/demo.json";

export type Demo = { data: DataSource; clock: Clock };

/**
 * Demoen med innholdet `input`, som valideres. Ugyldig innhold gir `unavailable` på alle lesinger.
 * Quiztilstanden i besøket speiles til `storage`. Uten det ligger den bare i minnet. Klokka står på
 * demo-dagen i fila.
 */
export function createDemo(input: unknown, storage?: DemoStorage | null): Demo {
  const data = new DemoDataSource(input, storage);
  return { data, clock: new DemoClock(data.today) };
}

/** `sessionStorage` i nettleseren, så tilstanden bare ligger i fanen. Ellers, eller når den ikke kan nås, ingenting. */
function sessionStore(): DemoStorage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

let demo: Demo | null = null;

/** Datakilden og klokka for demoen med `demo-data/demo.json`. Fila valideres første gang. */
export function getDemo(): Demo {
  demo ??= createDemo(demoFile, sessionStore());
  return demo;
}
