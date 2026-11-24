// Klokka i demoen: alltid samme dato, så alle besøkende ser det samme (AD-3, AD-11).
import type { Clock } from "@/application/clock";

export const DEMO_TODAY = "2026-12-01";

export class DemoClock implements Clock {
  today(): string {
    return DEMO_TODAY;
  }
}
