// Klokka i demoen: alltid demo-dagen fra demofila, så alle besøkende ser det samme (AD-3, AD-11).
import type { Clock } from "@/application/clock";

export class DemoClock implements Clock {
  /** `today` er demo-dagen, `ÅÅÅÅ-MM-DD`. */
  constructor(private readonly day: string) {}

  today(): string {
    return this.day;
  }
}
