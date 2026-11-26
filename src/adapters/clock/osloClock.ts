// Klokka i appen: dagens dato i norsk tid, Europe/Oslo (AD-11). Eneste sted som leser nåtiden
// for datologikk. `now` kan byttes ut i testene.
import type { Clock } from "@/application/clock";

// `en-CA` gir datoen som `ÅÅÅÅ-MM-DD`.
const osloDateFormat = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/Oslo",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export class OsloClock implements Clock {
  constructor(private readonly now: () => Date = () => new Date()) {}

  today(): string {
    return osloDateFormat.format(this.now());
  }
}
