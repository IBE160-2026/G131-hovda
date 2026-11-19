import { describe, expect, it } from "vitest";
import { countWords, normalizeNote, summaryHashSource, validateSummaryText } from "./summary";

describe("normalizeNote", () => {
  it("trimmer, gjør \\r\\n om til \\n og tillater bare én tom linje på rad", () => {
    expect(normalizeNote("  \r\nEn\r\n\r\n\r\n  \r\nTo\n\n\nTre  \n")).toBe("En\n\nTo\n\nTre");
  });

  it("fjerner mellomrom og tabulatorer på slutten av linjene, også på en tom linje", () => {
    expect(normalizeNote("En  \t\n \t\nTo\t")).toBe("En\n\nTo");
    expect(normalizeNote("En \nTo")).toBe(normalizeNote("En\nTo"));
  });

  it("lar én tom linje stå", () => {
    expect(normalizeNote("En\n\nTo")).toBe("En\n\nTo");
  });
});

describe("summaryHashSource", () => {
  const parts = { noteText: "Notat", learningGoals: "- mål", keyConcepts: "- begrep", instructionVersion: "innhold.v1" };

  it("er lik for notater som bare skiller seg i linjeskift og mellomrom rundt", () => {
    expect(summaryHashSource({ ...parts, noteText: "\r\nNotat\r\n" })).toBe(summaryHashSource(parts));
  });

  it("endres når notat, læringsmål, nøkkelbegreper eller instruksjonsversjon endres", () => {
    const base = summaryHashSource(parts);
    expect(summaryHashSource({ ...parts, noteText: "Notat 2" })).not.toBe(base);
    expect(summaryHashSource({ ...parts, learningGoals: "- nytt mål" })).not.toBe(base);
    expect(summaryHashSource({ ...parts, keyConcepts: "" })).not.toBe(base);
    expect(summaryHashSource({ ...parts, instructionVersion: "innhold.v2" })).not.toBe(base);
  });

  it("skiller feltene, så tekst som flyttes mellom dem gir annen kilde", () => {
    expect(summaryHashSource({ ...parts, noteText: "a", learningGoals: "b" })).not.toBe(
      summaryHashSource({ ...parts, noteText: "ab", learningGoals: "" }),
    );
  });
});

describe("countWords", () => {
  it("teller ord skilt med mellomrom og linjeskift", () => {
    expect(countWords("")).toBe(0);
    expect(countWords("  En  to\ntre\n\n fire ")).toBe(4);
  });
});

describe("validateSummaryText", () => {
  it("godtar tekst på høyst 600 ord og trimmer den", () => {
    expect(validateSummaryText("  Kort og greit. ")).toEqual({ ok: true, text: "Kort og greit." });
    expect(validateSummaryText(Array(600).fill("ord").join(" ")).ok).toBe(true);
  });

  it("avviser tom tekst", () => {
    expect(validateSummaryText(" \n ")).toEqual({ ok: false, reason: "Sammendraget er tomt." });
  });

  it("avviser mer enn 600 ord", () => {
    expect(validateSummaryText(Array(601).fill("ord").join(" "))).toEqual({
      ok: false,
      reason: "Sammendraget har 601 ord, mer enn 600.",
    });
  });
});
