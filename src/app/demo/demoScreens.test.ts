// Skjermene i demoen med datakilden på demo-data/demo.json, slik nettleseren tegner dem når fila er lest.
import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { getSubchapterSummary } from "@/application/chapterOverview";
import type { DataSource } from "@/application/dataSource";
import { createDemo, getDemo } from "@/composition/demo";
import demoFile from "../../../demo-data/demo.json";
import {
  noSummaryMessage,
  subchapterNotFoundMessage,
  summaryReportLabel,
  unavailableMessage,
} from "../(innlogget)/emner/formState";
import { DemoCoursesView } from "./DemoCourses";
import { DemoCourseView, loadDemoCourse } from "./emner/[id]/DemoCourse";
import { DemoSummaryView } from "./emner/[id]/delkapitler/[nummer]/DemoSummary";
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

const courses = (source: DataSource) =>
  source.listCourses().then((result) => renderToStaticMarkup(createElement(DemoCoursesView, { courses: result })));
const course = (source: DataSource, courseId = id) =>
  loadDemoCourse(source, courseId).then((result) =>
    renderToStaticMarkup(createElement(DemoCourseView, { id: courseId, result })),
  );
const summary = (source: DataSource, nummer: string) =>
  getSubchapterSummary(source, id, nummer).then((result) =>
    renderToStaticMarkup(createElement(DemoSummaryView, { id, result })),
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
    expect(html).toContain("0 av 7 gjennomført");
    for (const nummer of ["1.1", "1.2", "1.3", "1.4", "1.5", "1.6", "2.1"]) {
      expect(html).toContain(`href="/demo/emner/demo-ibe430/delkapitler/${nummer}"`);
    }
    expect(html.match(/>klart</g)).toHaveLength(7);
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
  it("viser sammendraget for 1.2 fra fila, uten quizknapp eller feilrapport", async () => {
    const html = await summary(data, "1.2");
    const sub = demoFile.chapters[0].subchapters.find((s) => s.number === "1.2")!;
    expect(html).toContain("<h1");
    expect(html).toContain(sub.title);
    expect(html).toContain("Kapittel 1: ");
    expect(html).not.toContain(noSummaryMessage);
    expect(visibleText(html)).not.toContain("**");
    // Første ord i sammendraget står i teksten.
    expect(visibleText(html)).toContain(sub.summary.split(/\s/)[0]);
    for (const word of ["Ta quizen", summaryReportLabel, "<form", "<button"]) expect(html).not.toContain(word);
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
