// Porten for dagens dato (AD-11). Datologikk skal gå via denne, så demoen kan ha en fast dato.

export interface Clock {
  /** Dagens dato som `ÅÅÅÅ-MM-DD`. */
  today(): string;
}
