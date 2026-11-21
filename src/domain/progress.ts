/**
 * Framdriften i et emne (FR-15, FR-20). Ren funksjon uten avhengigheter (AD-2). Målet er 90 % av de
 * aktive delkapitlene, rundet opp, og regnes fra antallet som finnes. Det hardkodes aldri.
 */

/** Andelen av delkapitlene som er målet: 90 %, som brøk så den regnes med heltall. */
export const GOAL_SHARE = { numerator: 9, denominator: 10 } as const;

export type CourseProgress = {
  completed: number;
  total: number;
  /** 90 % av `total`, rundet opp. */
  goal: number;
  /** Hvor mange som gjenstår til målet. 0 når målet er nådd. */
  remaining: number;
};

/** Framdriften med `completed` gjennomførte av `total` aktive delkapitler. */
export function courseProgress(total: number, completed: number): CourseProgress {
  const { numerator, denominator } = GOAL_SHARE;
  const goal = Math.floor((total * numerator + denominator - 1) / denominator);
  return { completed, total, goal, remaining: Math.max(0, goal - completed) };
}
