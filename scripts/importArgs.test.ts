import { describe, expect, it } from "vitest";
import { isConfirmed, notesFilePath, parseImportArgs } from "./importArgs";

describe("parseImportArgs", () => {
  it("tolker miljø, emnekode og kapittelnummer", () => {
    expect(parseImportArgs(["--target", "dev", "ibe430", "1"])).toEqual({
      ok: true,
      value: { target: "dev", courseCode: "IBE430", chapterNumber: 1 },
    });
  });

  it("godtar --target=prod og valget etter de andre argumentene", () => {
    expect(parseImportArgs(["IBE430", "2", "--target=prod"])).toEqual({
      ok: true,
      value: { target: "prod", courseCode: "IBE430", chapterNumber: 2 },
    });
  });

  it("krever --target", () => {
    expect(parseImportArgs(["IBE430", "1"])).toEqual({
      ok: false,
      error: "Velg miljø med --target dev eller --target prod.",
    });
    expect(parseImportArgs(["IBE430", "1", "--target"]).ok).toBe(false);
  });

  it("avviser andre miljøer enn dev og prod", () => {
    expect(parseImportArgs(["--target", "test", "IBE430", "1"])).toEqual({
      ok: false,
      error: "--target må være dev eller prod, ikke «test».",
    });
  });

  it("krever nøyaktig emnekode og kapittelnummer", () => {
    expect(parseImportArgs(["--target", "dev", "IBE430"]).ok).toBe(false);
    expect(parseImportArgs(["--target", "dev", "IBE430", "1", "2"]).ok).toBe(false);
  });

  it("avviser ugyldig kapittelnummer", () => {
    for (const n of ["0", "1.2", "en", "-1"]) {
      expect(parseImportArgs(["--target", "dev", "IBE430", n]).ok).toBe(false);
    }
  });

  it("avviser emnekoder som kan peke ut av notatmappen", () => {
    expect(parseImportArgs(["--target", "dev", "../x", "1"]).ok).toBe(false);
    expect(parseImportArgs(["--target", "dev", "IBE/430", "1"]).ok).toBe(false);
  });

  it("avviser ukjente valg, som --force (kommer i 1.5)", () => {
    expect(parseImportArgs(["--target", "dev", "--force", "IBE430", "1"])).toEqual({
      ok: false,
      error: "Ukjent valg: --force.",
    });
  });
});

describe("notesFilePath", () => {
  it("peker på notatfilen for emnet og kapittelet", () => {
    expect(notesFilePath({ courseCode: "IBE430", chapterNumber: 3 })).toBe("G131-hovda/notater/IBE430/kapittel-3.md");
  });
});

describe("isConfirmed", () => {
  it("godtar bare ja", () => {
    expect(isConfirmed("ja")).toBe(true);
    expect(isConfirmed(" JA \n")).toBe(true);
    expect(isConfirmed("j")).toBe(false);
    expect(isConfirmed("yes")).toBe(false);
    expect(isConfirmed("")).toBe(false);
    expect(isConfirmed(null)).toBe(false);
  });
});
