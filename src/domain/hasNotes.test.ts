import { describe, expect, it } from "vitest";
import { hasNotes } from "./hasNotes";

describe("hasNotes", () => {
  it("gir false for tom tekst", () => {
    expect(hasNotes("")).toBe(false);
  });

  it("gir false for null og undefined", () => {
    expect(hasNotes(null)).toBe(false);
    expect(hasNotes(undefined)).toBe(false);
  });

  it("gir false for bare mellomrom og linjeskift", () => {
    expect(hasNotes("   \n\t  \r\n")).toBe(false);
  });

  it("gir false for plassholderen, også med mellomrom rundt", () => {
    expect(hasNotes("*Ingen notater ennå.*")).toBe(false);
    expect(hasNotes("\n  *Ingen notater ennå.*  \n")).toBe(false);
  });

  it("gir true for ekte notattekst", () => {
    expect(hasNotes("SAP er verdens største ES-leverandør.")).toBe(true);
  });

  it("gir true når plassholderen står sammen med annen tekst", () => {
    expect(hasNotes("*Ingen notater ennå.*\n\nMen her er et notat.")).toBe(true);
  });
});
