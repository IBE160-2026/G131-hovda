import { describe, expect, it } from "vitest";
import {
  isStudyDay,
  isValidDate,
  norwegianDate,
  osloDate,
  planSnapshot,
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
