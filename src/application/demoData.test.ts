/// <reference types="vite/client" />
// Demodataene (story 2.1): skjemaet og brukstilfellet som bygger dem fra datakilden.
import { describe, expect, it } from "vitest";
import innhold1 from "../../G131-hovda/notater/IBE430/kapittel-1.innhold.md?raw";
import kapittel1 from "../../G131-hovda/notater/IBE430/kapittel-1.md?raw";
import innhold2 from "../../G131-hovda/notater/IBE430/kapittel-2.innhold.md?raw";
import kapittel2 from "../../G131-hovda/notater/IBE430/kapittel-2.md?raw";
import kapittel5 from "../../G131-hovda/notater/IBE430/kapittel-5.md?raw";
import { buildDemoData, DEMO_PLAN, demoMessages, serializeDemoData, validateDemoData, type DemoData } from "./demoData";
import { studyPlanMessages } from "@/domain/studyPlan";
import { importChapter } from "./importChapter";
import { subchapterInputHash } from "./summaryHash";
import { MemoryDataSource } from "./testing/MemoryDataSource";

async function setup() {
  const data = new MemoryDataSource();
  await data.createCourse({
    code: "IBE430",
    name: "Virksomhetssystemer",
    learningOutcomes: "Studenten kan forklare forretningsprosesser.",
    examForm: "Skriftlig eksamen, 4 timer.",
  });
  return data;
}

async function importFile(data: MemoryDataSource, chapterNumber: number, notes: string, content?: string) {
  const result = await importChapter(data, notes, { courseCode: "IBE430", chapterNumber }, content ? { content } : {});
  if (result.status !== "ok") throw new Error(JSON.stringify(result));
}

/** IBE430 med kapittel 1 (alle klare) og kapittel 2 (2.1 klar, 2.2 og 2.4 uten bank). */
async function withChapters() {
  const data = await setup();
  await importFile(data, 1, kapittel1, innhold1);
  await importFile(data, 2, kapittel2, innhold2);
  return data;
}

const sub = (data: MemoryDataSource, number: string) =>
  data.chapters.flatMap((c) => c.subchapters).find((s) => s.number === number)!;

const chapterOf = (data: MemoryDataSource, number: string) =>
  data.chapters.find((c) => c.subchapters.some((s) => s.number === number))!;

/** En ny klar bank for delkapittelet med samme hash som notatet har nå. `themes[i]` er temaet til spørsmål i. */
async function addBank(data: MemoryDataSource, number: string, themes: string[]) {
  const chapter = chapterOf(data, number);
  const s = sub(data, number);
  await data.addQuestionBank({
    subchapterId: s.id,
    modelId: "claude-code/test",
    promptVersion: "innhold.v2",
    inputHash: await subchapterInputHash(chapter, s.noteText),
    contentHash: "c".repeat(64),
    themes: [...new Set(themes)],
    questions: themes.map((theme, i) => ({
      question: `Spørsmål ${i + 1}?`,
      options: ["A", "B", "C", "D"],
      correctIndex: i % 4,
      explanation: "Fordi.",
      theme,
      sourceNumber: null,
      originalText: null,
    })),
  });
}

/** Gjør delkapittelet klart med et sammendrag og en bank. */
async function makeReady(data: MemoryDataSource, number: string) {
  const chapter = chapterOf(data, number);
  const s = sub(data, number);
  await data.addSummaryVersion({
    subchapterId: s.id,
    status: "klart",
    text: `Sammendrag av ${number}.`,
    modelId: "claude-code/test",
    promptVersion: "innhold.v2",
    inputHash: await subchapterInputHash(chapter, s.noteText),
  });
  await addBank(data, number, Array.from({ length: 20 }, (_, i) => (i % 2 === 0 ? "Alfa" : "Beta")));
}

async function build(data: MemoryDataSource) {
  const result = await buildDemoData(data, "IBE430");
  if (result.status !== "ok") throw new Error(JSON.stringify(result));
  return result;
}

const numbers = (demo: DemoData) => demo.chapters.flatMap((c) => c.subchapters.map((s) => s.number));

/** En gyldig minstefil som testene av skjemaet endrer på. */
function validDemo(): DemoData {
  return {
    schemaVersion: 2,
    course: { id: "demo-ibe430", code: "IBE430", name: "Virksomhetssystemer", learningOutcomes: "", examForm: "" },
    plan: { examDate: "2026-12-10", planStart: "2026-11-30", today: "2026-12-01" },
    chapters: [
      {
        number: 1,
        title: "Kapittel én",
        subchapters: [
          {
            id: "demo-1.1",
            number: "1.1",
            title: "En",
            summary: "Sammendrag.",
            themes: [{ id: "demo-1.1-t1" }, { id: "demo-1.1-t2" }],
            questions: Array.from({ length: 20 }, (_, i) => ({
              id: `demo-1.1-q${String(i + 1).padStart(2, "0")}`,
              themeId: i % 2 === 0 ? "demo-1.1-t1" : "demo-1.1-t2",
              question: `Spørsmål ${i + 1}?`,
              options: ["A", "B", "C", "D"],
              correctIndex: 0,
              explanation: "Fordi.",
            })),
          },
        ],
      },
    ],
  };
}

describe("buildDemoData", () => {
  it("tar med de klare delkapitlene i kapittel 1 og 2 og lister 2.2 og 2.4 med årsak", async () => {
    const data = await withChapters();
    const result = await build(data);
    expect(numbers(result.data)).toEqual(["1.1", "1.2", "1.3", "1.4", "1.5", "1.6", "2.1"]);
    expect(result.written).toBe(7);
    expect(result.skipped.map((s) => [s.number, s.reason])).toEqual([
      ["2.2", demoMessages.notReady("mangler innhold")],
      ["2.4", demoMessages.notReady("mangler innhold")],
    ]);
    expect(result.data.course).toEqual({
      id: "demo-ibe430",
      code: "IBE430",
      name: "Virksomhetssystemer",
      learningOutcomes: "Studenten kan forklare forretningsprosesser.",
      examForm: "Skriftlig eksamen, 4 timer.",
    });
    expect(result.data.plan).toEqual({ examDate: "2026-12-10", planStart: "2026-11-30", today: "2026-12-01" });
    expect(result.data.plan).toEqual(DEMO_PLAN);
    expect(Object.keys(result.data)).toEqual(["schemaVersion", "course", "plan", "chapters"]);
    expect(validateDemoData(result.data).ok).toBe(true);
  });

  it("bruker siste klare sammendrag og bankens rekkefølge, med ID-er av strukturen", async () => {
    const data = await withChapters();
    const result = await build(data);
    const s11 = result.data.chapters[0].subchapters[0];
    const stored = data.summaryVersions.filter((v) => v.subchapterId === sub(data, "1.1").id).at(-1)!;
    expect(s11.summary).toBe(stored.text);
    expect(s11.id).toBe("demo-1.1");
    const bank = await data.listQuizBank(sub(data, "1.1").id);
    if (bank.status !== "ok") throw new Error("utilgjengelig");
    expect(s11.questions.map((q) => q.question)).toEqual(bank.value.map((q) => q.question));
    expect(s11.questions.map((q) => q.id).slice(0, 3)).toEqual(["demo-1.1-q01", "demo-1.1-q02", "demo-1.1-q03"]);
    // Temaene nummereres i rekkefølgen de først brukes.
    const firstUse = [...new Set(s11.questions.map((q) => q.themeId))];
    expect(s11.themes.map((t) => t.id)).toEqual(firstUse);
    expect(firstUse[0]).toBe("demo-1.1-t1");
  });

  it("har ingen ID-er, notater, hasher eller tidspunkter fra datakilden", async () => {
    const data = await withChapters();
    const json = serializeDemoData((await build(data)).data);
    const dbIds = [
      ...data.courses.map((c) => c.id),
      ...data.chapters.flatMap((c) => [c.id, ...c.subchapters.map((s) => s.id)]),
      ...data.themes.map((t) => t.id),
      ...data.quizQuestions.map((q) => q.id),
    ];
    for (const id of dbIds) expect(json).not.toContain(`"${id}"`);
    for (const key of ["noteText", "learningGoals", "keyConcepts", "inputHash", "createdAt", "modelId", "status"]) {
      expect(json).not.toContain(`"${key}"`);
    }
    expect(json).not.toContain(data.summaryVersions[0].inputHash);
  });

  it("hopper over et delkapittel med 19 aktive spørsmål", async () => {
    const data = await withChapters();
    data.quizQuestions.find((q) => q.subchapterId === sub(data, "1.3").id)!.status = "trukket";
    const result = await build(data);
    expect(numbers(result.data)).not.toContain("1.3");
    expect(result.skipped).toContainEqual({ number: "1.3", title: sub(data, "1.3").title, reason: "færre enn 20 spørsmål" });
  });

  it("hopper over et delkapittel der et tema har bare ett aktivt spørsmål", async () => {
    const data = await withChapters();
    await addBank(data, "1.2", [...Array.from({ length: 19 }, () => "Alfa"), "Beta"]);
    const result = await build(data);
    expect(numbers(result.data)).not.toContain("1.2");
    expect(result.skipped).toContainEqual({
      number: "1.2",
      title: sub(data, "1.2").title,
      reason: "temaet har færre enn 2 spørsmål",
    });
  });

  it("tar ikke med kapittel 5, selv når et delkapittel der er klart", async () => {
    const data = await withChapters();
    await importFile(data, 5, kapittel5);
    await makeReady(data, "5.1");
    const result = await build(data);
    expect(result.data.chapters.map((c) => c.number)).toEqual([1, 2]);
    expect(result.skipped.map((s) => s.number)).toEqual(["2.2", "2.4"]);
  });

  it("tar ikke med kapitler uten klare delkapitler", async () => {
    const data = await setup();
    await importFile(data, 2, kapittel2, innhold2);
    data.quizQuestions.find((q) => q.subchapterId === sub(data, "2.1").id)!.status = "trukket";
    await importFile(data, 5, kapittel5);
    await makeReady(data, "5.1");
    expect(await buildDemoData(data, "IBE430")).toMatchObject({ status: "noReadySubchapters" });
  });

  it("gir «noReadySubchapters» når ingenting er klart", async () => {
    const data = await setup();
    await importFile(data, 1, kapittel1);
    const result = await buildDemoData(data, "IBE430");
    expect(result.status).toBe("noReadySubchapters");
    if (result.status !== "noReadySubchapters") return;
    expect(result.skipped.map((s) => s.reason)).toEqual(Array(6).fill(demoMessages.notReady("mangler innhold")));
  });

  it("gir «invalid» med stien til feltet når en klar bank har et tomt alternativ", async () => {
    const data = await withChapters();
    const s12 = sub(data, "1.2");
    const latest = data.questionBankVersions.filter((v) => v.subchapterId === s12.id).at(-1)!;
    data.quizQuestions.find((q) => q.bankVersionId === latest.id)!.options[1] = "";
    expect(await buildDemoData(data, "IBE430")).toEqual({
      status: "invalid",
      errors: ["chapters[0].subchapters[1].questions[0].options[1]: skal ikke være tom"],
    });
  });

  it("gir «courseNotFound» når eieren ikke har emnet", async () => {
    const data = new MemoryDataSource();
    expect(await buildDemoData(data, "IBE430")).toEqual({ status: "courseNotFound", courseCode: "IBE430" });
  });

  it("gir «unavailable» når datakilden svikter", async () => {
    const data = await withChapters();
    data.down = true;
    expect(await buildDemoData(data, "IBE430")).toEqual({ status: "unavailable" });
    data.down = false;
    data.quizReadsDown = true;
    expect(await buildDemoData(data, "IBE430")).toEqual({ status: "unavailable" });
  });

  it("gir byte for byte samme fil ved ny kjøring", async () => {
    const data = await withChapters();
    const first = serializeDemoData((await build(data)).data);
    const second = serializeDemoData((await build(data)).data);
    expect(second).toBe(first);
    expect(first.endsWith("}\n")).toBe(true);
    expect(first.split("\n")[1]).toBe('  "schemaVersion": 2,');
  });
});

describe("validateDemoData", () => {
  it("godtar en gyldig fil", () => {
    expect(validateDemoData(validDemo())).toEqual({ ok: true, value: validDemo() });
  });

  it("avviser ukjente felt med stien til feltet", () => {
    const withNote = validDemo() as unknown as { chapters: { subchapters: Record<string, unknown>[] }[] };
    withNote.chapters[0].subchapters[0].noteText = "notat";
    expect(validateDemoData(withNote)).toEqual({
      ok: false,
      errors: ["chapters[0].subchapters[0].noteText: ukjent felt"],
    });
    const withEmail = { ...validDemo(), ownerEmail: "eier@example.com" };
    expect(validateDemoData(withEmail)).toEqual({ ok: false, errors: ["demo.ownerEmail: ukjent felt"] });
  });

  it("avviser manglende felt, feil typer og ugyldige verdier", () => {
    const demo = validDemo();
    const q = demo.chapters[0].subchapters[0].questions[0] as Record<string, unknown>;
    q.correctIndex = 4;
    q.options = ["A", "B", "C"];
    delete q.explanation;
    (demo as Record<string, unknown>).schemaVersion = 1;
    demo.chapters[0].subchapters[0].title = " ";
    const result = validateDemoData(demo);
    expect(result).toEqual({
      ok: false,
      errors: [
        "schemaVersion: skal være 2",
        "chapters[0].subchapters[0].title: skal ikke være tom",
        "chapters[0].subchapters[0].questions[0].explanation: mangler",
        "chapters[0].subchapters[0].questions[0].options: skal ha fire alternativer",
        "chapters[0].subchapters[0].questions[0].correctIndex: skal være 0, 1, 2 eller 3",
      ],
    });
    expect(validateDemoData(null)).toEqual({ ok: false, errors: ["demo: skal være et objekt"] });
  });

  it("avviser en fil uten planinndata", () => {
    const withoutPlan: Partial<DemoData> = validDemo();
    delete withoutPlan.plan;
    expect(validateDemoData(withoutPlan)).toEqual({ ok: false, errors: ["demo.plan: mangler"] });
    expect(validateDemoData({ ...validDemo(), plan: { ...DEMO_PLAN, extra: "x" } })).toEqual({
      ok: false,
      errors: ["plan.extra: ukjent felt"],
    });
  });

  it("avviser ugyldige datoer i planinndataene med stien til feltet", () => {
    const withPlan = (plan: Record<string, unknown>) => validateDemoData({ ...validDemo(), plan: { ...DEMO_PLAN, ...plan } });
    expect(withPlan({ today: "2026-13-01", planStart: 5 })).toEqual({
      ok: false,
      errors: ["plan.planStart: skal være tekst", "plan.today: skal være en gyldig dato (ÅÅÅÅ-MM-DD)"],
    });
    expect(withPlan({ planStart: "2026-12-10" })).toEqual({
      ok: false,
      errors: ["plan.examDate: Eksamensdatoen må være etter planstart."],
    });
    expect(withPlan({ today: "2026-11-29" })).toEqual({ ok: false, errors: ["plan.today: skal ikke være før planstart"] });
    expect(withPlan({ today: "2026-12-10" })).toEqual({ ok: false, errors: ["plan.today: skal være før eksamensdatoen"] });
    expect(withPlan({ today: "2026-11-30" }).ok).toBe(true);
    expect(withPlan({ examDate: "10.12.2026" })).toEqual({
      ok: false,
      errors: ["plan.examDate: skal være en gyldig dato (ÅÅÅÅ-MM-DD)"],
    });
    // Lørdag til mandag har ingen studiedager.
    expect(withPlan({ planStart: "2026-12-05", today: "2026-12-05", examDate: "2026-12-07" })).toEqual({
      ok: false,
      errors: [`plan.examDate: ${studyPlanMessages.noStudyDays}`],
    });
  });

  it("avviser planinndata som ikke er et objekt", () => {
    for (const plan of [null, "2026-12-01", [DEMO_PLAN]]) {
      expect(validateDemoData({ ...validDemo(), plan })).toEqual({ ok: false, errors: ["plan: skal være et objekt"] });
    }
  });

  it("avviser et kapittel utenfor kapittel 1–4", () => {
    const demo = validDemo();
    demo.chapters[0].number = 5;
    demo.chapters[0].subchapters[0].number = "5.1";
    demo.chapters[0].subchapters[0].id = "demo-5.1";
    demo.chapters[0].subchapters[0].themes = [{ id: "demo-5.1-t1" }, { id: "demo-5.1-t2" }];
    demo.chapters[0].subchapters[0].questions.forEach((q, i) => {
      q.id = `demo-5.1-q${String(i + 1).padStart(2, "0")}`;
      q.themeId = i % 2 === 0 ? "demo-5.1-t1" : "demo-5.1-t2";
    });
    expect(validateDemoData(demo)).toEqual({
      ok: false,
      errors: ["chapters[0].number: skal være et av kapitlene 1, 2, 3, 4"],
    });
  });

  it("avviser ID-er som ikke er laget av strukturen", () => {
    const demo = validDemo();
    demo.course.id = "c1";
    demo.chapters[0].subchapters[0].questions[1].id = "8f14e45f-ceea-467f-a0e6-1c3f5f8b7d21";
    const result = validateDemoData(demo);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors).toEqual([
      "course.id: skal være «demo-ibe430»",
      "chapters[0].subchapters[0].questions[1].id: skal være «demo-1.1-q02»",
    ]);
  });

  it("avviser færre enn 20 spørsmål, et tema med færre enn 2 og et ukjent tema", () => {
    const demo = validDemo();
    const s = demo.chapters[0].subchapters[0];
    s.questions.pop();
    s.questions.forEach((q, i) => (q.themeId = i === 0 ? "demo-1.1-t2" : "demo-1.1-t1"));
    s.questions[0].themeId = "demo-1.1-t1";
    s.questions[1].themeId = "demo-1.1-t2";
    s.questions[2].themeId = "demo-1.1-t3";
    const result = validateDemoData(demo);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors).toEqual([
      "chapters[0].subchapters[0].questions: har 19 spørsmål, færre enn 20",
      "chapters[0].subchapters[0].questions[2].themeId: finnes ikke i themes",
      "chapters[0].subchapters[0].themes: temaet demo-1.1-t2 har 1 spørsmål, færre enn 2",
    ]);
  });

  it("avviser feil rekkefølge på kapitler og temaer, og delkapitler i feil kapittel", () => {
    const demo = validDemo();
    const second = structuredClone(demo.chapters[0]);
    demo.chapters.unshift({ ...second, number: 2 });
    demo.chapters[1].subchapters[0].themes.reverse();
    const result = validateDemoData(demo);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors).toEqual(
      expect.arrayContaining([
        "chapters[0].subchapters[0].number: skal være «2.m»",
        "chapters[1].number: kapitlene skal stå i stigende rekkefølge uten duplikater",
        "chapters[1].subchapters[0].themes[0].id: skal være «demo-1.1-t1»",
      ]),
    );
  });
});
