import { describe, expect, it } from "vitest";
import { safeNextPath } from "./safeNextPath";

describe("safeNextPath", () => {
  it("godtar en relativ sti i appen", () => {
    expect(safeNextPath("/start")).toBe("/start");
    expect(safeNextPath("/start?fane=2")).toBe("/start?fane=2");
  });

  it("sender til forsiden når neste mangler", () => {
    expect(safeNextPath(null)).toBe("/");
    expect(safeNextPath("")).toBe("/");
  });

  it("sender ikke ut av appen", () => {
    expect(safeNextPath("https://annen.no")).toBe("/");
    expect(safeNextPath("//annen.no")).toBe("/");
    expect(safeNextPath("/\\annen.no")).toBe("/");
    expect(safeNextPath("javascript:alert(1)")).toBe("/");
  });

  it("sender ikke tilbake til fornyingsruten", () => {
    expect(safeNextPath("/auth/forny?neste=/start")).toBe("/");
  });
});
