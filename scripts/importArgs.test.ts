import { describe, expect, it } from "vitest";
import { contentFilePath, isConfirmed, notesFilePath, parseCourseChapter, parseImportArgs } from "./importArgs";

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

  it("avviser ukjente valg", () => {
    expect(parseImportArgs(["--target", "dev", "--fort", "IBE430", "1"])).toEqual({
      ok: false,
      error: "Ukjent valg: --fort.",
    });
  });

  it("tolker --force med et delkapittel i kapittelet", () => {
    expect(parseImportArgs(["--target", "dev", "--force", "1.2", "IBE430", "1"])).toEqual({
      ok: true,
      value: { target: "dev", courseCode: "IBE430", chapterNumber: 1, force: "1.2" },
    });
    expect(parseImportArgs(["--target=dev", "IBE430", "2", "--force=2.4"])).toEqual({
      ok: true,
      value: { target: "dev", courseCode: "IBE430", chapterNumber: 2, force: "2.4" },
    });
  });

  it("avviser --force for et delkapittel i et annet kapittel", () => {
    expect(parseImportArgs(["--target", "dev", "--force", "2.1", "IBE430", "1"])).toEqual({
      ok: false,
      error: "--force 2.1 hører ikke til kapittel 1. Ingenting er skrevet.",
    });
  });

  it("avviser --force uten gyldig delkapittel eller brukt to ganger", () => {
    expect(parseImportArgs(["--target", "dev", "IBE430", "1", "--force"]).ok).toBe(false);
    expect(parseImportArgs(["--target", "dev", "--force", "1", "IBE430", "1"]).ok).toBe(false);
    expect(parseImportArgs(["--target", "dev", "--force", "1.x", "IBE430", "1"]).ok).toBe(false);
    expect(parseImportArgs(["--target", "dev", "--force", "1.1", "--force", "1.2", "IBE430", "1"])).toEqual({
      ok: false,
      error: "--force kan bare brukes én gang.",
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

describe("contentFilePath", () => {
  it("peker på innholdsfilen ved siden av notatfilen", () => {
    expect(contentFilePath({ courseCode: "IBE430", chapterNumber: 1 })).toBe(
      "G131-hovda/notater/IBE430/kapittel-1.innhold.md",
    );
  });
});

describe("parseCourseChapter", () => {
  it("tolker emnekode og kapittelnummer og avviser resten", () => {
    expect(parseCourseChapter(["ibe430", "1"])).toEqual({ ok: true, value: { courseCode: "IBE430", chapterNumber: 1 } });
    expect(parseCourseChapter(["IBE430"]).ok).toBe(false);
    expect(parseCourseChapter(["../x", "1"]).ok).toBe(false);
    expect(parseCourseChapter(["IBE430", "0"]).ok).toBe(false);
  });
});
