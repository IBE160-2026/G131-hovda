import { describe, expect, it } from "vitest";
import {
  isStudyDay,
  isValidDate,
  dailySuggestionSize,
  norwegianDate,
  osloDate,
  planSnapshot,
  planStatus,
  relativeDayLabel,
  studyDaysBetween,
  studyPlanMessages,
  validateStudyPlanDates,
} from "./studyPlan";

describe("studiedager", () => {
  it("er mandag–fredag, ikke lørdag og søndag", () => {
    expect(isStudyDay("2026-11-23")).toBe(true); // mandag
    expect(isStudyDay("2026-11-27")).toBe(true); // fredag
    expect(isStudyDay("2026-11-28")).toBe(false); // lørdag
    expect(isStudyDay("2026-11-29")).toBe(false); // søndag
    expect(isStudyDay("1970-01-01")).toBe(true); // torsdag
    expect(isStudyDay("1969-12-28")).toBe(false); // søndag
  });

  it("telles fra og med første dato til, men ikke med, den andre", () => {
    expect(studyDaysBetween("2026-11-26", "2026-12-10")).toBe(10);
    expect(studyDaysBetween("2026-11-26", "2026-12-11")).toBe(11);
    expect(studyDaysBetween("2026-10-01", "2026-12-10")).toBe(50);
    expect(studyDaysBetween("2026-11-28", "2026-11-30")).toBe(0);
    expect(studyDaysBetween("2026-11-26", "2026-11-26")).toBe(0);
    expect(studyDaysBetween("2026-11-27", "2026-11-26")).toBe(0);
  });
});

describe("isValidDate", () => {
  it("godtar bare ekte datoer på formen ÅÅÅÅ-MM-DD", () => {
    expect(isValidDate("2026-12-10")).toBe(true);
    expect(isValidDate("2028-02-29")).toBe(true);
    expect(isValidDate("2026-02-29")).toBe(false);
    expect(isValidDate("2026-13-01")).toBe(false);
    expect(isValidDate("10.12.2026")).toBe(false);
    expect(isValidDate("")).toBe(false);
  });
});

describe("osloDate", () => {
  it("gir datoen i Oslo for et tidspunkt i UTC", () => {
    expect(osloDate("2026-11-25T22:59:59Z")).toBe("2026-11-25");
    expect(osloDate("2026-11-25T23:30:00Z")).toBe("2026-11-26");
    expect(osloDate("2026-07-01T22:00:00+00:00")).toBe("2026-07-02");
  });
});

describe("planSnapshot", () => {
  const ids = ["s1", "s2", "s3"];

  it("teller det som er gjennomført før planstart i G₀ og resten i R₀", () => {
    expect(
      planSnapshot({
        activeSubchapterIds: ids,
        completions: [
          { subchapterId: "s1", completedAt: "2026-11-20T10:00:00Z" },
          { subchapterId: "s2", completedAt: "2026-11-26T10:00:00Z" },
        ],
        planStart: "2026-11-26",
        examDate: "2026-12-10",
      }),
    ).toEqual({ g0: 1, r0: 2, d: 10 });
  });

  it("teller ikke et delkapittel gjennomført natt til planstart (Oslo-datoen er planstart)", () => {
    const snapshot = planSnapshot({
      activeSubchapterIds: ids,
      completions: [{ subchapterId: "s1", completedAt: "2026-11-25T23:30:00Z" }],
      planStart: "2026-11-26",
      examDate: "2026-12-10",
    });
    expect(snapshot.g0).toBe(0);
    expect(snapshot.r0).toBe(3);
  });

  it("teller ikke avkrysninger for delkapitler som ikke er aktive", () => {
    const snapshot = planSnapshot({
      activeSubchapterIds: ["s1"],
      completions: [
        { subchapterId: "s1", completedAt: "2026-11-01T10:00:00Z" },
        { subchapterId: "fjernet", completedAt: "2026-11-01T10:00:00Z" },
      ],
      planStart: "2026-11-26",
      examDate: "2026-12-10",
    });
    expect(snapshot).toEqual({ g0: 1, r0: 0, d: 10 });
  });
});

describe("validateStudyPlanDates", () => {
  const today = "2026-11-26";

  it("bruker i dag som planstart når feltet er tomt", () => {
    expect(validateStudyPlanDates({ examDate: " 2026-12-10 ", planStart: "  " }, today)).toEqual({
      ok: true,
      value: { examDate: "2026-12-10", planStart: today },
    });
  });

  it("godtar en planstart før i dag", () => {
    expect(validateStudyPlanDates({ examDate: "2026-12-10", planStart: "2026-10-01" }, today)).toEqual({
      ok: true,
      value: { examDate: "2026-12-10", planStart: "2026-10-01" },
    });
  });

  it("krever en gyldig eksamensdato og en gyldig planstart", () => {
    expect(validateStudyPlanDates({ examDate: "", planStart: "x" }, today)).toEqual({
      ok: false,
      errors: { examDate: studyPlanMessages.emptyExamDate, planStart: studyPlanMessages.invalidPlanStart },
    });
    expect(validateStudyPlanDates({ examDate: "2026-02-30", planStart: "" }, today)).toEqual({
      ok: false,
      errors: { examDate: studyPlanMessages.invalidExamDate },
    });
  });

  it("avviser en eksamensdato som ikke er etter planstart", () => {
    for (const examDate of ["2026-11-20", today]) {
      expect(validateStudyPlanDates({ examDate, planStart: "" }, today)).toEqual({
        ok: false,
        errors: { examDate: studyPlanMessages.examNotAfterStart },
      });
    }
  });

  it("avviser en plan uten studiedager før eksamen", () => {
    expect(validateStudyPlanDates({ examDate: "2026-11-30", planStart: "2026-11-28" }, today)).toEqual({
      ok: false,
      errors: { examDate: studyPlanMessages.noStudyDays },
    });
  });
});

describe("norwegianDate", () => {
  it("skriver datoen på norsk", () => {
    expect(norwegianDate("2026-12-10")).toBe("10. desember 2026");
    expect(norwegianDate("2027-01-01")).toBe("1. januar 2027");
  });
});

describe("dailySuggestionSize", () => {
  it("er ⌈R₀ / D⌉, minst 1, med 1 til ved etterslep og aldri over 3", () => {
    expect(dailySuggestionSize(8, 10, false)).toBe(1);
    expect(dailySuggestionSize(8, 10, true)).toBe(2);
    expect(dailySuggestionSize(0, 10, false)).toBe(1);
    expect(dailySuggestionSize(25, 10, false)).toBe(3);
    expect(dailySuggestionSize(25, 10, true)).toBe(3);
    expect(dailySuggestionSize(50, 10, false)).toBe(3);
  });
});

describe("planStatus", () => {
  // Planstart tor 26.11.2026, eksamen tor 10.12: G₀ = 1, R₀ = 8, D = 10.
  const plan = { planStart: "2026-11-26", examDate: "2026-12-10", g0: 1, r0: 8, d: 10 };
  const all = (completed: number) => ({ completed, reachable: 9 });

  it("er i rute første dag (d = 0)", () => {
    expect(planStatus(plan, all(1), "2026-11-26")).toEqual({ kind: "onTrack" });
  });

  it("ligger bak med veien tilbake på 2 om dagen, også i helgen", () => {
    // d = 5, planlagt 5, 2 gjennomført.
    expect(planStatus(plan, all(2), "2026-12-03")).toEqual({
      kind: "behind",
      backlog: 3,
      perDay: 2,
      onTrackOn: "2026-12-06",
    });
  });

  it("gir ingen dag når eieren ikke rekker det før eksamen", () => {
    expect(planStatus(plan, all(1), "2026-12-09")).toEqual({ kind: "behind", backlog: 8, perDay: 2, onTrackOn: null });
  });

  it("gir i rute i morgen når én kveld er nok", () => {
    // d = 5, planlagt 5, 4 gjennomført: 2 i kveld gir 6, og planlagt fredag er 6.
    expect(planStatus(plan, all(4), "2026-12-03")).toMatchObject({ backlog: 1, onTrackOn: "2026-12-04" });
  });

  it("viser forsprang", () => {
    // d = 2, planlagt 3.
    expect(planStatus(plan, all(5), "2026-11-30")).toEqual({ kind: "ahead", lead: 2 });
  });

  it("gir ikke etterslep for delkapitler uten notater", () => {
    // Bare 2 av de 8 har notater: N = 3, planlagt 5, forventet 3.
    expect(planStatus(plan, { completed: 3, reachable: 3 }, "2026-12-03")).toEqual({ kind: "onTrack" });
  });

  it("regner dagen før eksamen med d = 9", () => {
    expect(planStatus(plan, all(8), "2026-12-09")).toMatchObject({ kind: "behind", backlog: 1, onTrackOn: "2026-12-10" });
    expect(planStatus(plan, all(9), "2026-12-09")).toEqual({ kind: "onTrack" });
  });

  it("bruker d = D etter eksamen", () => {
    // d ville vært 11, men planlagt blir 9 og ikke mer.
    expect(planStatus(plan, all(9), "2026-12-11")).toEqual({ kind: "onTrack" });
    expect(planStatus(plan, all(8), "2026-12-11")).toEqual({ kind: "behind", backlog: 1, perDay: 2, onTrackOn: null });
  });

  it("bruker d = 0 før planstart", () => {
    expect(planStatus({ ...plan, planStart: "2026-11-30" }, all(1), "2026-11-26")).toEqual({ kind: "onTrack" });
  });
});

describe("relativeDayLabel", () => {
  it("sier i morgen, ukedagen den neste uka, ellers ukedag og dato", () => {
    expect(relativeDayLabel("2026-12-04", "2026-12-03")).toBe("i morgen");
    expect(relativeDayLabel("2026-12-06", "2026-12-03")).toBe("søndag");
    expect(relativeDayLabel("2026-12-09", "2026-12-03")).toBe("onsdag");
    expect(relativeDayLabel("2026-12-10", "2026-12-03")).toBe("torsdag 10. desember");
    expect(relativeDayLabel("2026-12-14", "2026-12-03")).toBe("mandag 14. desember");
  });
});
