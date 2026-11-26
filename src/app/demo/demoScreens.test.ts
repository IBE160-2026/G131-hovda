// Skjermene i demoen med datakilden på demo-data/demo.json, slik nettleseren tegner dem når fila er lest.
import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { getSubchapterSummary } from "@/application/chapterOverview";
import { answerQuiz, getQuiz, startQuiz } from "@/application/quiz";
import type { DataSource } from "@/application/dataSource";
import { createDemo, getDemo } from "@/composition/demo";
import demoFile from "../../../demo-data/demo.json";
import {
  aheadText,
  behindText,
  belowThresholdMessage,
  catchUpText,
  completedBadge,
  completedMessage,
  dailySuggestionHeading,
  newQuizLabel,
  onTrackMessage,
  sessionDoneMessage,
  startSessionLabel,
  suggestionText,
  noSummaryMessage,
  reportQuestionLabel,
  subchapterNotFoundMessage,
  summaryReportLabel,
  unavailableMessage,
} from "../(innlogget)/emner/formState";
import { DemoCoursesView } from "./DemoCourses";
import { dailySuggestionSize, planStatus, relativeDayLabel, studyDaysBetween } from "@/domain/studyPlan";
import { demoCourseLoader, DemoCourseView, loadDemoCourse } from "./emner/[id]/DemoCourse";
import { DemoSummaryView } from "./emner/[id]/delkapitler/[nummer]/DemoSummary";
import { DemoQuizView } from "./emner/[id]/delkapitler/[nummer]/quiz/DemoQuiz";
import DemoLayout from "./layout";
import {
  demoBadgeText,
  demoCourseNotFoundMessage,
  demoExitLabel,
  demoLoadingMessage,
  demoNoScriptMessage,
} from "./messages";

const data = getDemo().data;
const broken = createDemo({ ...demoFile, chapters: [] }).data;
const id = "demo-ibe430";
const noop = () => {};
/** Antall delkapitler i demofila, så testene tåler nye kapitler fra `export-demo`. */
const subchapterCount = demoFile.chapters.flatMap((c) => c.subchapters).length;

const courses = (source: DataSource) =>
  source.listCourses().then((result) => renderToStaticMarkup(createElement(DemoCoursesView, { courses: result })));
/** Demo-dagen, slik `DemoCourse` henter den fra klokka. */
const today = getDemo().clock.today();
const course = (source: DataSource, courseId = id) =>
  loadDemoCourse(source, courseId, today).then((result) =>
    renderToStaticMarkup(createElement(DemoCourseView, { id: courseId, result })),
  );
const summary = (source: DataSource, nummer: string) =>
  getSubchapterSummary(source, id, nummer).then((result) =>
    renderToStaticMarkup(createElement(DemoSummaryView, { id, result, startQuizAction: noop })),
  );

/** Teksten uten tagger, slik den står på skjermen. */
const visibleText = (html: string) => html.replace(/<[^>]+>/g, "");

describe("merket i demoen", () => {
  it("sier at det er en demo og lenker til forsiden", () => {
    const html = renderToStaticMarkup(DemoLayout({ params: Promise.resolve({}), children: "innhold" }));
    expect(html).toContain(demoBadgeText);
    expect(html).toMatch(new RegExp(`<a [^>]*href="/"[^>]*>${demoExitLabel}</a>`));
    expect(html.indexOf(demoBadgeText)).toBeLessThan(html.indexOf("innhold"));
    expect(html).toMatch(new RegExp(`<noscript>.*${demoNoScriptMessage}.*</noscript>`));
  });
});

describe("emnelisten i demoen", () => {
  it("lenker IBE430 rett til kapittellisten, uten «Velg», «Endre» eller «Slett»", async () => {
    const html = await courses(data);
    expect(html).toMatch(/<a [^>]*href="\/demo\/emner\/demo-ibe430"[^>]*>IBE430 /);
    for (const word of ["Velg", "Endre", "Slett", "Aktivt emne", "<form", "<button"]) expect(html).not.toContain(word);
  });

  it("viser «Laster …» før fila er lest", () => {
    expect(renderToStaticMarkup(createElement(DemoCoursesView, { courses: null }))).toContain(demoLoadingMessage);
  });

  it("viser feilmeldingen når fila er ugyldig", async () => {
    expect(await courses(broken)).toContain(unavailableMessage);
  });
});

describe("emnekortet i demoen", () => {
  it("viser eksamensform, læringsutbytte, framdriften 0 av 7 og alle delkapitlene som «klart» med lenke", async () => {
    const html = await course(data);
    expect(html).toContain("Eksamensform:");
    expect(html).toContain("Læringsutbytte");
    expect(html).toContain(`0 av ${subchapterCount} gjennomført`);
    for (const nummer of demoFile.chapters.flatMap((c) => c.subchapters.map((s) => s.number))) {
      expect(html).toContain(`href="/demo/emner/demo-ibe430/delkapitler/${nummer}"`);
    }
    expect(html.match(/>klart</g)).toHaveLength(subchapterCount);
    for (const word of ["Bytt emne", "Logg ut", "Aktivt emne", "<form", "<button"]) expect(html).not.toContain(word);
  });

  it("sier fra og lenker til emnene når emnet ikke finnes", async () => {
    const html = await course(data, "x");
    expect(html).toContain(demoCourseNotFoundMessage);
    expect(html).toContain('href="/demo"');
  });

  it("viser feilmeldingen når fila er ugyldig", async () => {
    expect(await course(broken)).toContain(unavailableMessage);
  });
});

describe("lesesiden i demoen", () => {
  it("viser sammendraget for 1.2 fra fila og «Ta quizen», uten feilrapport", async () => {
    const html = await summary(data, "1.2");
    const sub = demoFile.chapters[0].subchapters.find((s) => s.number === "1.2")!;
    expect(html).toContain("<h1");
    expect(html).toContain(sub.title);
    expect(html).toContain("Kapittel 1: ");
    expect(html).not.toContain(noSummaryMessage);
    expect(visibleText(html)).not.toContain("**");
    // Første ord i sammendraget står i teksten.
    expect(visibleText(html)).toContain(sub.summary.split(/\s/)[0]);
    expect(html).toMatch(/<button type="submit"[^>]*>Ta quizen<\/button>/);
    for (const word of [summaryReportLabel, "<textarea", "<details"]) expect(html).not.toContain(word);
  });

  it("sier fra og lenker til kapitlene for et ukjent delkapittel", async () => {
    const html = await summary(data, "9.9");
    expect(html).toContain(subchapterNotFoundMessage);
    expect(html).toContain('href="/demo/emner/demo-ibe430"');
  });

  it("viser feilmeldingen når fila er ugyldig", async () => {
    expect(await summary(broken, "1.2")).toContain(unavailableMessage);
  });
});

/** Quizskjermen i demoen slik `DemoQuiz` tegner den med `query`. */
const quiz = (source: DataSource, nummer: string, query: { svar?: number; resultat?: string } = {}) =>
  getQuiz(source, id, nummer, { answered: query.svar, resultQuizId: query.resultat }).then((result) =>
    renderToStaticMarkup(
      createElement(DemoQuizView, { id, nummer, result, startAction: noop, answerAction: () => noop }),
    ),
  );

/** Tar en quiz på `nummer` og svarer riktig der `answers` er sann. Gir ID-en til quizen. */
async function takeQuiz(source: DataSource, nummer: string, answers: boolean[]) {
  const started = await startQuiz(source, id, nummer);
  if (started.status !== "ok") throw new Error(started.status);
  for (const right of answers) {
    const view = await getQuiz(source, id, nummer);
    if (view.status !== "ok" || view.stage !== "question") throw new Error("ingen spørsmål");
    const { position, correctIndex } = view.item;
    await answerQuiz(source, id, nummer, started.quizId, position, right ? correctIndex : (correctIndex + 1) % view.item.options.length);
  }
  return started.quizId;
}

describe("quizen i demoen", () => {
  it("viser «Start quizen» og lenker tilbake til sammendraget i demoen", async () => {
    const html = await quiz(createDemo(demoFile).data, "1.2");
    expect(html).toContain("Start quizen</button>");
    expect(html).toContain('href="/demo/emner/demo-ibe430/delkapitler/1.2"');
  });

  it("viser spørsmål 1 av 10 med fire alternativer, uten feilrapport", async () => {
    const source = createDemo(demoFile).data;
    await startQuiz(source, id, "1.2");
    const html = await quiz(source, "1.2");
    expect(html).toContain("Spørsmål 1 av 10");
    expect(html.match(/type="radio"/g)).toHaveLength(4);
    for (const word of [reportQuestionLabel, "<textarea", "<details"]) expect(html).not.toContain(word);
  });

  it("viser riktig svar og forklaringen ved feil, og lenken til neste spørsmål", async () => {
    const source = createDemo(demoFile).data;
    await takeQuiz(source, "1.2", [false]);
    const html = await quiz(source, "1.2", { svar: 1 });
    expect(html).toContain("Riktig svar: ");
    expect(html).toContain("Neste spørsmål");
    expect(html).toContain('href="/demo/emner/demo-ibe430/delkapitler/1.2/quiz"');
    expect(html).not.toContain(reportQuestionLabel);
  });

  it("gir «gjennomført» og framdriften 1 av alle etter 8 av 10, uten feilrapport", async () => {
    const source = createDemo(demoFile).data;
    const quizId = await takeQuiz(source, "1.2", [true, true, false, true, true, true, true, true, false, true]);
    const html = await quiz(source, "1.2", { resultat: quizId });
    expect(html).toContain("8 av 10 riktige");
    expect(html).toContain(completedMessage);
    expect(html).not.toContain(newQuizLabel);
    for (const word of [reportQuestionLabel, "<textarea", "<details"]) expect(html).not.toContain(word);

    const card = await course(source);
    expect(card).toContain(`1 av ${subchapterCount} gjennomført`);
    // I kapittellisten, etter dagens forslag, står merket ved 1.2 og ingen andre.
    const list = card.slice(card.indexOf("</section>", card.indexOf("dagens-forslag")));
    const badge = `>${completedBadge}<`;
    expect(list.split(badge)).toHaveLength(2);
    expect(list.indexOf(badge)).toBeGreaterThan(list.indexOf("delkapitler/1.2"));
    expect(list.indexOf(badge)).toBeLessThan(list.indexOf("delkapitler/1.3"));
  });

  it("tilbyr en ny quiz under 80 %, uten avkrysning", async () => {
    const source = createDemo(demoFile).data;
    const quizId = await takeQuiz(source, "1.2", [...Array(7).fill(true), false, false, false]);
    const html = await quiz(source, "1.2", { resultat: quizId });
    expect(html).toContain("7 av 10 riktige");
    expect(html).toContain(belowThresholdMessage);
    expect(html).toContain(`${newQuizLabel}</button>`);
    expect(html).not.toContain(completedMessage);
    expect(await course(source)).toContain(`0 av ${subchapterCount} gjennomført`);
  });

  it("sier fra og lenker til kapitlene for et ukjent delkapittel, og viser feilmeldingen når fila er ugyldig", async () => {
    const html = await quiz(createDemo(demoFile).data, "9.9");
    expect(html).toContain(subchapterNotFoundMessage);
    expect(html).toContain('href="/demo/emner/demo-ibe430"');
    expect(await quiz(broken, "1.2")).toContain(unavailableMessage);
  });

  it("viser «Laster …» før quizen er lest", () => {
    const html = renderToStaticMarkup(
      createElement(DemoQuizView, { id, nummer: "1.2", result: null, startAction: noop, answerAction: () => noop }),
    );
    expect(html).toContain(demoLoadingMessage);
  });
});

/** Teksten i dagens forslag, fra seksjonen til den slutter. */
const suggestionPart = (html: string) => {
  const start = html.indexOf("dagens-forslag");
  return start < 0 ? "" : html.slice(start, html.indexOf("</section>", start));
};
const startLink = (nummer: string) =>
  new RegExp(`<a [^>]*href="/demo/emner/demo-ibe430/delkapitler/${nummer.replace(".", "\\.")}"[^>]*>${startSessionLabel}</a>`);

// Forventningene regnes ut fra demofila, så testene tåler nye delkapitler fra `export-demo`.
// Med dagens 7 delkapitler er det 1.1 og 1.2, 1 bak og «2 delkapitler i kveld, så er du i rute i morgen».
const allNumbers = demoFile.chapters.flatMap((c) => c.subchapters.map((s) => s.number));
const demoPlan = {
  ...demoFile.plan,
  g0: 0,
  r0: subchapterCount,
  d: studyDaysBetween(demoFile.plan.planStart, demoFile.plan.examDate),
};
const startStatus = planStatus(demoPlan, { completed: 0, reachable: subchapterCount }, today);
const suggested = allNumbers.slice(0, dailySuggestionSize(demoPlan.r0, demoPlan.d, startStatus.kind === "behind"));

/** Det framdriften sier om planen med `completed` delkapitler gjennomført. */
function planLine(completed: number): string[] {
  const status = planStatus(demoPlan, { completed, reachable: subchapterCount }, today);
  if (status.kind === "onTrack") return [onTrackMessage];
  if (status.kind === "ahead") return [aheadText(status.lead)];
  const label = status.onTrackOn ? relativeDayLabel(status.onTrackOn, today) : null;
  return [behindText(status.backlog), catchUpText(Math.min(status.perDay, subchapterCount - completed), label)];
}

describe("dagens forslag og foran/bak i demoen", () => {
  it("lar studenten ligge litt bak planen", () => {
    expect(startStatus.kind).toBe("behind");
    if (startStatus.kind !== "behind") return;
    expect(startStatus.backlog).toBeLessThanOrEqual(3);
    expect(startStatus.onTrackOn).not.toBeNull();
  });

  it("viser forslaget med «Start økta» over framdriften, etterslepet med veien tilbake, og eksamensdatoen", async () => {
    const html = await course(createDemo(demoFile).data);
    const part = suggestionPart(html);
    expect(part).toContain(dailySuggestionHeading);
    expect(part).toContain(suggestionText(suggested));
    expect(part).toMatch(startLink(suggested[0]));
    expect(part).not.toContain(completedBadge);
    expect(html.indexOf("dagens-forslag")).toBeLessThan(html.indexOf("Framdrift"));
    for (const line of planLine(0)) expect(html).toContain(line);
    expect(html).toContain(`<time dateTime="${demoFile.plan.examDate}">`);
    // Forslaget er en lenke, ikke et skjema.
    for (const word of ["<form", "<button"]) expect(html).not.toContain(word);
  });

  it("bruker demo-dagen fra klokka når `DemoCourse` laster", async () => {
    const result = await demoCourseLoader(id)(createDemo(demoFile).data);
    expect(result.status === "ok" && result.today).toBe(demoFile.plan.today);
    const html = renderToStaticMarkup(createElement(DemoCourseView, { id, result }));
    expect(suggestionPart(html)).toContain(suggestionText(suggested));
    for (const line of planLine(0)) expect(html).toContain(line);
  });

  it("er det samme for alle besøkende", async () => {
    expect(await course(createDemo(demoFile).data)).toBe(await course(createDemo(demoFile).data));
  });

  it("ligger fast når det første delkapittelet fullføres i besøket, mens framdriften oppdateres", async () => {
    const source = createDemo(demoFile).data;
    await takeQuiz(source, suggested[0], Array(10).fill(true));
    const html = await course(source);
    const part = suggestionPart(html);
    expect(part).toContain(suggestionText(suggested));
    expect(part.split(`>${completedBadge}<`)).toHaveLength(2);
    if (suggested.length > 1) expect(part).toMatch(startLink(suggested[1]));
    expect(html).toContain(`1 av ${subchapterCount} gjennomført`);
    for (const line of planLine(1)) expect(html).toContain(line);
  });

  it("sier at dagens økt er gjort når alle de foreslåtte er fullført", async () => {
    const source = createDemo(demoFile).data;
    for (const nummer of suggested) await takeQuiz(source, nummer, Array(10).fill(true));
    const html = await course(source);
    const part = suggestionPart(html);
    expect(part).toContain(suggestionText(suggested));
    expect(part).toContain(sessionDoneMessage);
    expect(part).not.toContain(startSessionLabel);
    for (const line of planLine(suggested.length)) expect(html).toContain(line);
  });

  it("viser emnet uten forslag og uten foran/bak når planen ikke kan leses", async () => {
    const source = createDemo(demoFile).data;
    const noPlan: DataSource = Object.assign(Object.create(source), {
      getStudyPlan: async () => ({ status: "unavailable" as const }),
    });
    const html = await course(noPlan);
    expect(html).not.toContain(dailySuggestionHeading);
    for (const line of planLine(0)) expect(html).not.toContain(line);
    expect(html).toContain(`0 av ${subchapterCount} gjennomført`);
  });

  it("viser feilmeldingen når fila mangler planinndataene", async () => {
    const old: Partial<typeof demoFile> = { ...demoFile, schemaVersion: 1 };
    delete old.plan;
    const html = await course(createDemo(old).data);
    expect(html).toContain(unavailableMessage);
    expect(html).not.toContain(dailySuggestionHeading);
  });
});

describe("klokka i demoen", () => {
  it("står på demo-dagen i fila", () => {
    expect(createDemo(demoFile).clock.today()).toBe("2026-12-01");
    expect(createDemo({ ...demoFile, plan: { ...demoFile.plan, today: "2026-12-02" } }).clock.today()).toBe("2026-12-02");
  });
});
