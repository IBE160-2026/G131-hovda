import { describe, expect, it } from "vitest";
import { OsloClock } from "./osloClock";

const at = (iso: string) => new OsloClock(() => new Date(iso)).today();

describe("OsloClock", () => {
  it("bytter dato ved midnatt i Oslo på vintertid (UTC+1)", () => {
    expect(at("2026-11-26T22:59:59Z")).toBe("2026-11-26");
    expect(at("2026-11-26T23:00:00Z")).toBe("2026-11-27");
  });

  it("bytter dato ved midnatt i Oslo på sommertid (UTC+2)", () => {
    expect(at("2026-07-01T21:59:59Z")).toBe("2026-07-01");
    expect(at("2026-07-01T22:00:00Z")).toBe("2026-07-02");
  });

  it("gir en dato på formen ÅÅÅÅ-MM-DD uten injisert klokke", () => {
    expect(new OsloClock().today()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
