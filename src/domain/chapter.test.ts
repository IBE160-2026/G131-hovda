import { describe, expect, it } from "vitest";
import { chapterChanges, planSubchapters, subchapterChangeOf, type StoredSubchapter } from "./chapter";

const stored = (number: string, position: number, extra: Partial<StoredSubchapter> = {}): StoredSubchapter => ({
  id: `id-${number}`,
  number,
  position,
  title: `Tittel ${number}`,
  noteText: `Notat ${number}`,
  removed: false,
  ...extra,
});
const incoming = (number: string, extra: Partial<{ title: string; noteText: string }> = {}) => ({
  number,
  title: `Tittel ${number}`,
  noteText: `Notat ${number}`,
  ...extra,
});

describe("chapterChanges", () => {
  const fields = { title: "T", learningGoals: "L", keyConcepts: "K" };

  it("gir tomt objekt når ingenting er endret", () => {
    expect(chapterChanges(fields, { ...fields })).toEqual({});
  });

  it("gir bare de endrede feltene", () => {
    expect(chapterChanges(fields, { ...fields, title: "Ny" })).toEqual({ title: "Ny" });
  });
});

describe("planSubchapters", () => {
  it("oppretter alle ved første import, med rekkefølge fra 1", () => {
    const steps = planSubchapters([], [incoming("1.1"), incoming("1.2")]);
    expect(steps).toEqual([
      { kind: "create", number: "1.1", fields: { title: "Tittel 1.1", noteText: "Notat 1.1", position: 1 } },
      { kind: "create", number: "1.2", fields: { title: "Tittel 1.2", noteText: "Notat 1.2", position: 2 } },
    ]);
  });

  it("gir uendret når filen er lik", () => {
    const steps = planSubchapters([stored("1.1", 1), stored("1.2", 2)], [incoming("1.1"), incoming("1.2")]);
    expect(steps.map(subchapterChangeOf)).toEqual(["unchanged", "unchanged"]);
  });

  it("oppdaterer bare feltene som er endret", () => {
    const steps = planSubchapters([stored("1.1", 1)], [incoming("1.1", { noteText: "Nytt notat" })]);
    expect(steps).toEqual([
      { kind: "update", id: "id-1.1", number: "1.1", changes: { noteText: "Nytt notat" }, restore: false },
    ]);
  });

  it("merker et delkapittel som er borte fra filen, som fjernet", () => {
    const steps = planSubchapters([stored("1.1", 1), stored("1.6", 2)], [incoming("1.1")]);
    expect(steps).toEqual([
      { kind: "unchanged", id: "id-1.1", number: "1.1" },
      { kind: "remove", id: "id-1.6", number: "1.6" },
    ]);
  });

  it("lar et delkapittel som alt er fjernet, være i fred", () => {
    const steps = planSubchapters([stored("1.1", 1), stored("1.6", 2, { removed: true })], [incoming("1.1")]);
    expect(steps.map(subchapterChangeOf)).toEqual(["unchanged"]);
  });

  it("gjør samme delkapittel aktivt igjen med ny tittel og tekst", () => {
    const steps = planSubchapters(
      [stored("1.6", 6, { removed: true })],
      [incoming("1.6", { title: "Ny tittel", noteText: "Ny tekst" })],
    );
    expect(steps).toEqual([
      {
        kind: "update",
        id: "id-1.6",
        number: "1.6",
        changes: { title: "Ny tittel", noteText: "Ny tekst", position: 1 },
        restore: true,
      },
    ]);
    expect(subchapterChangeOf(steps[0])).toBe("restored");
  });

  it("gjenoppretter også når feltene er like", () => {
    const steps = planSubchapters([stored("1.1", 1, { removed: true })], [incoming("1.1")]);
    expect(steps).toEqual([{ kind: "update", id: "id-1.1", number: "1.1", changes: {}, restore: true }]);
  });

  it("oppdaterer rekkefølgen når delkapitler bytter plass", () => {
    const steps = planSubchapters([stored("1.1", 1), stored("1.2", 2)], [incoming("1.2"), incoming("1.1")]);
    expect(steps).toEqual([
      { kind: "update", id: "id-1.2", number: "1.2", changes: { position: 1 }, restore: false },
      { kind: "update", id: "id-1.1", number: "1.1", changes: { position: 2 }, restore: false },
    ]);
  });
});
