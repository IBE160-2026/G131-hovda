import { describe, expect, it } from "vitest";
import { courseProgress } from "./progress";

describe("courseProgress", () => {
  it("setter målet til 90 % av delkapitlene, rundet opp", () => {
    expect(courseProgress(21, 0).goal).toBe(19);
    expect(courseProgress(19, 0).goal).toBe(18);
    expect(courseProgress(6, 0).goal).toBe(6);
    expect(courseProgress(10, 0).goal).toBe(9);
    expect(courseProgress(1, 0).goal).toBe(1);
    expect(courseProgress(0, 0).goal).toBe(0);
  });

  it("gir hvor mange som er igjen til målet", () => {
    expect(courseProgress(19, 5)).toEqual({ completed: 5, total: 19, goal: 18, remaining: 13 });
  });

  it("gir 0 igjen når målet er nådd eller passert", () => {
    expect(courseProgress(19, 18).remaining).toBe(0);
    expect(courseProgress(19, 19).remaining).toBe(0);
  });
});
