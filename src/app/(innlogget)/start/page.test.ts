import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

const getDataSourceForRender = vi.fn();
// Dagens dato i Oslo for planformelen. Endres i testene for foran/bak.
let today = "2026-12-03";
vi.mock("@/composition/server", () => ({ getDataSourceForRender, getClock: () => ({ today: () => today }) }));
vi.mock("./actions", () => ({ logOut: async () => {} }));

const { ActiveCourse } = await import("./page");
const {
  completedBadge,
  flexibleDayMessage,
  goalReachedMessage,
  nothingReadyMessage,
  onTrackMessage,
  reviewText,
  sessionDoneMessage,
  suggestionText,
  unavailableMessage,
} = await import("../emner/formState");
const { subchapterInputHash } = await import("@/application/summaryHash");

const course = {
  id: "c1",
  code: "IBE430",
  name: "Virksomhetssystemer",
  learningOutcomes: "LU",
  examForm: "Skriftlig",
};
const ok = <T>(value: T) => ({ status: "ok", value });

const listChapters = vi.fn();
const listSummaryVersions = vi.fn();
const listQuestionBanks = vi.fn();
const listCompletions = vi.fn();
const getStudyPlan = vi.fn();

/** Siste klare versjon per delkapittel-ID, med `inputHash`. Delkapitler som ikke er med, har ingen. */
type ReadyHashes = Record<string, string>;

/** Svaret fra `listSummaryVersions` eller `listQuestionBanks` for de klare hashene. */
function versions(ready: ReadyHashes | { status: "unavailable" }, ids: string[]) {
  if ("status" in ready) return ready;
  return ok(
    ids.map((subchapterId) => {
      const version = ready[subchapterId]
        ? { id: `v-${subchapterId}`, subchapterId, status: "klart", text: "Tekst", inputHash: ready[subchapterId] }
        : null;
      return { subchapterId, latest: version, latestReady: version };
    }),
  );
}

async function render(
  active: unknown,
  courses: unknown,
  chapters: unknown = ok([]),
  ready: ReadyHashes | { status: "unavailable" } = {},
  // Spørsmålsbankene har de samme klare hashene som sammendragene hvis ikke annet er oppgitt.
  banks: ReadyHashes | { status: "unavailable" } = ready,
  // Delkapitlene som er krysset av (kl. 10 UTC 21.11, eller tidspunktet per ID), eller at avkrysningene ikke kan leses.
  completed: string[] | Record<string, string> | { status: "unavailable" } = [],
  // Studieplanen for emnet, eller at den ikke kan leses.
  plan: unknown = ok(null),
) {
  getDataSourceForRender.mockResolvedValue({
    getActiveCourse: async () => active,
    listCourses: async () => courses,
    listChapters: listChapters.mockReset().mockResolvedValue(chapters),
    listSummaryVersions: listSummaryVersions.mockReset().mockImplementation(async (ids: string[]) => versions(ready, ids)),
    listQuestionBanks: listQuestionBanks.mockReset().mockImplementation(async (ids: string[]) => versions(banks, ids)),
    getStudyPlan: getStudyPlan.mockReset().mockResolvedValue(plan),
    listCompletions: listCompletions.mockReset().mockImplementation(async (ids: string[]) => {
      if ("status" in completed) return completed;
      const at: Record<string, string> = Array.isArray(completed)
        ? Object.fromEntries(completed.map((id) => [id, "2026-11-21T10:00:00Z"]))
        : completed;
      return ok(
        ids
          .filter((id) => id in at)
          .map((subchapterId) => ({ subchapterId, quizId: `z-${subchapterId}`, completedAt: at[subchapterId] })),
      );
    }),
  });
  return renderToStaticMarkup(await ActiveCourse());
}

describe("ActiveCourse", () => {
  beforeEach(() => getDataSourceForRender.mockReset());

  it("ber eieren opprette et emne når det ikke finnes noen", async () => {
    const html = await render(ok(null), ok([]));
    expect(html).toContain('href="/emner/ny"');
    expect(html).toContain("Opprett et emne");
  });

  it("ber eieren velge emne når ingen er aktive", async () => {
    const html = await render(ok(null), ok([course]));
    expect(html).toContain('href="/emner"');
    expect(html).toContain("Velg emne");
  });

  it("viser aktivt emne med «Bytt emne»", async () => {
    const html = await render(ok(course), ok([course]));
    expect(html).toContain("IBE430");
    expect(html).toContain("Virksomhetssystemer");
    expect(html).toContain("Bytt emne");
  });

  it("viser feilmeldingen når emnelisten ikke kan hentes", async () => {
    const html = await render(ok(null), { status: "unavailable" });
    expect(html).toContain(unavailableMessage);
    expect(html).toContain('role="alert"');
    expect(html).not.toContain("ingen emner");
  });

  it("viser feilmeldingen når aktivt emne ikke kan hentes", async () => {
    const html = await render({ status: "unavailable" }, ok([]));
    expect(html).toContain(unavailableMessage);
  });
});

const chapters = [
  {
    id: "k1",
    number: 1,
    title: "Organisasjoner",
    learningGoals: "",
    keyConcepts: "",
    subchapters: [
      { id: "d1", number: "1.1", title: "Det moderne", noteText: "Notat" },
      { id: "d2", number: "1.2", title: "Den funksjonelle", noteText: "Notat" },
    ],
  },
  {
    id: "k2",
    number: 2,
    title: "Forretningssystemer",
    learningGoals: "",
    keyConcepts: "",
    subchapters: [
      { id: "d3", number: "2.2", title: "Datatyper", noteText: "Notat" },
      { id: "d4", number: "2.3", title: "Super Skateboard Builders", noteText: "*Ingen notater ennå.*" },
      { id: "d5", number: "2.5", title: "SAP-programvaren", noteText: "  " },
    ],
  },
];

describe("kapittellisten på startsiden", () => {
  beforeEach(() => getDataSourceForRender.mockReset());

  it("viser kapitler og delkapitler i rekkefølge under aktivt emne", async () => {
    const html = await render(ok(course), ok([course]), ok(chapters));
    expect(listChapters).toHaveBeenCalledWith("c1");
    const order = ["Kapittel 1: Organisasjoner", "1.1", "1.2", "Kapittel 2: Forretningssystemer", "2.2", "2.3", "2.5"];
    const positions = order.map((text) => html.indexOf(text));
    expect(positions.every((p) => p >= 0)).toBe(true);
    expect([...positions].sort((a, b) => a - b)).toEqual(positions);
    expect(html).toContain("<ol");
  });

  it("merker delkapitler uten notater med «mangler notater»", async () => {
    const html = await render(ok(course), ok([course]), ok(chapters));
    expect(html.match(/mangler notater/g)).toHaveLength(2);
    const marked = html.split("<li").filter((li) => li.includes("mangler notater"));
    expect(marked.map((li) => (li.includes("2.3") ? "2.3" : li.includes("2.5") ? "2.5" : "?"))).toEqual(["2.3", "2.5"]);
  });

  it("henter alle sammendragsversjonene og spørsmålsbankene med ett kall hver", async () => {
    await render(ok(course), ok([course]), ok(chapters));
    expect(listSummaryVersions).toHaveBeenCalledTimes(1);
    expect(listSummaryVersions).toHaveBeenCalledWith(["d1", "d2", "d3", "d4", "d5"]);
    expect(listQuestionBanks).toHaveBeenCalledTimes(1);
    expect(listQuestionBanks).toHaveBeenCalledWith(["d1", "d2", "d3", "d4", "d5"]);
  });

  /** Statusmerket for delkapittelet med nummeret, og om det er en lenke. */
  function rowOf(html: string, number: string) {
    const li = html.split("<li").find((part) => part.includes(`>${number}<`)) ?? "";
    const status = ["klart", "utdatert", "mangler innhold", "mangler notater"].find((s) => li.includes(`>${s}<`));
    const link = li.match(/<a [^>]*href="([^"]*)"/)?.[1] ?? null;
    return { status, link };
  }

  it("viser status per delkapittel og lenker bare til dem med sammendrag", async () => {
    const hash = await subchapterInputHash({ learningGoals: "", keyConcepts: "" }, "Notat");
    const html = await render(ok(course), ok([course]), ok(chapters), { d1: hash, d2: "gammel-hash" });
    expect(rowOf(html, "1.1")).toEqual({ status: "klart", link: "/emner/c1/delkapitler/1.1" });
    expect(rowOf(html, "1.2")).toEqual({ status: "utdatert", link: "/emner/c1/delkapitler/1.2" });
    expect(rowOf(html, "2.2")).toEqual({ status: "mangler innhold", link: null });
    expect(rowOf(html, "2.3")).toEqual({ status: "mangler notater", link: null });
    expect(rowOf(html, "2.5")).toEqual({ status: "mangler notater", link: null });
    expect(html.match(/<a /g)).toHaveLength(3); // «Bytt emne», 1.1 og 1.2
  });

  it("viser «mangler innhold», men lenker til sammendraget, når bare spørsmålsbanken mangler", async () => {
    const hash = await subchapterInputHash({ learningGoals: "", keyConcepts: "" }, "Notat");
    const html = await render(ok(course), ok([course]), ok(chapters), { d1: hash }, {});
    expect(rowOf(html, "1.1")).toEqual({ status: "mangler innhold", link: "/emner/c1/delkapitler/1.1" });
    expect(rowOf(html, "2.2")).toEqual({ status: "mangler innhold", link: null });
  });

  it("viser feilmeldingen når spørsmålsbankene ikke kan hentes", async () => {
    const html = await render(ok(course), ok([course]), ok(chapters), {}, { status: "unavailable" });
    expect(html).toContain(unavailableMessage);
    expect(html).not.toContain("Kapittel 1: Organisasjoner");
  });

  it("viser feilmeldingen når sammendragene ikke kan hentes", async () => {
    const html = await render(ok(course), ok([course]), ok(chapters), { status: "unavailable" });
    expect(html).toContain(unavailableMessage);
    expect(html).toContain('role="alert"');
    expect(html).not.toContain("Kapittel 1: Organisasjoner");
  });

  it("sier fra når ingen kapitler er importert", async () => {
    const html = await render(ok(course), ok([course]), ok([]));
    expect(html).toContain("Ingen kapitler er importert ennå.");
  });

  it("viser feilmeldingen når kapitlene ikke kan hentes", async () => {
    const html = await render(ok(course), ok([course]), { status: "unavailable" });
    expect(html).toContain("Bytt emne");
    expect(html).toContain(unavailableMessage);
    expect(html).toContain('role="alert"');
  });
});

/** `n` delkapitler d1, d2, … i ett kapittel, alle med notater. */
function chapterWith(n: number) {
  return [
    {
      id: "k1",
      number: 1,
      title: "Organisasjoner",
      learningGoals: "",
      keyConcepts: "",
      subchapters: Array.from({ length: n }, (_, i) => ({
        id: `d${i + 1}`,
        number: `1.${i + 1}`,
        title: `Del ${i + 1}`,
        noteText: "Notat",
      })),
    },
  ];
}

const ids = (n: number) => Array.from({ length: n }, (_, i) => `d${i + 1}`);

describe("framdriften på startsiden", () => {
  beforeEach(() => getDataSourceForRender.mockReset());

  it("viser «5 av 19 gjennomført, mål 18» og «13 igjen til målet» øverst i emnekortet", async () => {
    const html = await render(ok(course), ok([course]), ok(chapterWith(19)), {}, {}, ids(5));
    expect(html).toContain("5 av 19 gjennomført, mål 18");
    expect(html).toContain("13 igjen til målet");
    expect(html).not.toContain(goalReachedMessage);
    expect(html.indexOf("gjennomført, mål")).toBeLessThan(html.indexOf("Aktivt emne"));
    expect(html).toMatch(/<progress aria-labelledby="framdrift-tekst" value="5" max="19"/);
    expect(html).toContain('id="framdrift-tekst"');
    expect(listCompletions).toHaveBeenCalledTimes(1);
    expect(listCompletions).toHaveBeenCalledWith(ids(19));
  });

  it("regner målet fra antallet delkapitler som finnes", async () => {
    const html = await render(ok(course), ok([course]), ok(chapterWith(6)), {}, {}, ids(1));
    expect(html).toContain("1 av 6 gjennomført, mål 6");
    expect(html).toContain("5 igjen til målet");
  });

  it("sier «Målet er nådd!» når nok er gjennomført", async () => {
    const html = await render(ok(course), ok([course]), ok(chapterWith(19)), {}, {}, ids(18));
    expect(html).toContain("18 av 19 gjennomført, mål 18");
    expect(html).toContain(goalReachedMessage);
    expect(html).not.toContain("igjen til målet");
  });

  it("viser ingen framdrift når emnet ikke har delkapitler", async () => {
    const html = await render(ok(course), ok([course]), ok([]));
    expect(html).not.toContain("<progress");
    expect(html).not.toContain("gjennomført, mål");
  });

  it("merker gjennomførte delkapitler med «gjennomført» ved siden av statusen", async () => {
    const html = await render(ok(course), ok([course]), ok(chapters), {}, {}, ["d1", "d4"]);
    const rows = html.split("<li").filter((li) => li.includes("rounded-xl border"));
    const marked = rows.filter((li) => li.includes(`>${completedBadge}<`));
    expect(marked.map((li) => li.match(/>(\d\.\d)</)?.[1])).toEqual(["1.1", "2.3"]);
    expect(html).toContain("2 av 5 gjennomført, mål 5");
  });

  it("viser feilmeldingen og ingen framdrift når avkrysningene ikke kan leses", async () => {
    const html = await render(ok(course), ok([course]), ok(chapters), {}, {}, { status: "unavailable" });
    expect(html).toContain(unavailableMessage);
    expect(html).toContain('role="alert"');
    expect(html).not.toContain("<progress");
    expect(html).not.toContain("Kapittel 1: Organisasjoner");
  });

  it("viser eksamensdatoen under eksamensformen når emnet har en plan", async () => {
    const plan = ok({ courseId: "c1", examDate: "2026-12-10", planStart: "2026-11-26", g0: 7, r0: 2, d: 10 });
    const html = await render(ok(course), ok([course]), ok([]), {}, {}, [], plan);
    expect(getStudyPlan).toHaveBeenCalledTimes(1);
    expect(getStudyPlan).toHaveBeenCalledWith("c1");
    expect(html).toContain('Eksamensdato:</span> <time dateTime="2026-12-10">10. desember 2026</time>');
    expect(html.indexOf("Eksamensform:")).toBeLessThan(html.indexOf("Eksamensdato:"));
  });

  it("viser ingen eksamensdato uten plan, eller når planen ikke kan leses", async () => {
    expect(await render(ok(course), ok([course]))).not.toContain("Eksamensdato");
    const unavailable = { status: "unavailable" };
    expect(await render(ok(course), ok([course]), ok([]), {}, {}, [], unavailable)).not.toContain("Eksamensdato");
  });
});

describe("foran eller bak planen på startsiden", () => {
  // Planstart tor 26.11.2026, eksamen tor 10.12: G₀ = 1, R₀ = 8, D = 10, ni delkapitler med notater.
  const plan = ok({ courseId: "c1", examDate: "2026-12-10", planStart: "2026-11-26", g0: 1, r0: 8, d: 10 });
  const show = (completed: number, day: string, studyPlan: unknown = plan) => {
    today = day;
    return render(ok(course), ok([course]), ok(chapterWith(9)), {}, {}, ids(completed), studyPlan);
  };
  /** Teksten i framdriftsindikatoren, uten tagger. */
  const progressOf = (html: string) =>
    (html.match(/<section aria-label="Framdrift"[\s\S]*?<\/section>/)?.[0] ?? "").replace(/<[^>]+>/g, " ");

  beforeEach(() => {
    getDataSourceForRender.mockReset();
    today = "2026-12-03";
  });

  it("viser etterslepet markert, med veien tilbake, under andelen", async () => {
    const html = await show(2, "2026-12-03");
    const text = progressOf(html);
    expect(text).toContain("3 delkapitler bak planen.");
    expect(text).toContain("2 delkapitler i kveld, så er du i rute søndag.");
    expect(text.indexOf("gjennomført, mål")).toBeLessThan(text.indexOf("bak planen"));
    expect(html).toMatch(/<div class="[^"]*bg-sun[^"]*"><p class="font-semibold">3 delkapitler bak planen\.<\/p>/);
    expect(text).not.toMatch(/ikke gjort/);
  });

  it("sier at etterslepet tas igjen litt etter litt når eksamen er for nær", async () => {
    const text = progressOf(await show(1, "2026-12-09"));
    expect(text).toContain("8 delkapitler bak planen.");
    expect(text).toContain("2 delkapitler om dagen tar deg nærmere planen.");
  });

  it("bruker entall og «i morgen» når én kveld er nok", async () => {
    const text = progressOf(await show(4, "2026-12-03"));
    expect(text).toContain("1 delkapittel bak planen.");
    expect(text).toContain("2 delkapitler i kveld, så er du i rute i morgen.");
  });

  it("gir ikke etterslep for delkapitler uten notater, og ber aldri om flere enn som kan tas", async () => {
    // d1–d4 er gjennomført (d4 uten notater), d5 har notater, d6–d9 mangler notater: N = 5.
    const subchapters = chapterWith(9)[0].subchapters.map((s, i) =>
      i === 3 ? { ...s, noteText: "  " } : i >= 5 ? { ...s, noteText: i === 5 ? "*Ingen notater ennå.*" : "" } : s,
    );
    const withGaps = ok([{ ...chapterWith(9)[0], subchapters }]);
    const render5 = (completed: number) =>
      render(ok(course), ok([course]), withGaps, {}, {}, ids(completed), plan).then(progressOf);
    // 3.12: planlagt 5, forventet min(5, 5) = 5.
    today = "2026-12-03";
    const behind = await render5(4);
    expect(behind).toContain("1 delkapittel bak planen.");
    expect(behind).toContain("1 delkapittel i kveld, så er du i rute i morgen.");
    // 4.12: planlagt 6, men forventet er fortsatt 5.
    today = "2026-12-04";
    expect(await render5(5)).toContain(onTrackMessage);
  });

  it("viser forspranget", async () => {
    const text = progressOf(await show(5, "2026-11-30"));
    expect(text).toContain("2 delkapitler foran planen.");
    expect(text).toContain("5 av 9 gjennomført");
  });

  it("viser at eieren er i rute", async () => {
    const html = await show(1, "2026-11-26");
    expect(progressOf(html)).toContain(onTrackMessage);
    expect(html).not.toContain("bg-sun");
  });

  it("viser framdriften uten foran/bak uten plan, eller når planen ikke kan leses", async () => {
    for (const studyPlan of [ok(null), { status: "unavailable" }]) {
      const text = progressOf(await show(2, "2026-12-03", studyPlan));
      expect(text).toContain("2 av 9 gjennomført");
      expect(text).not.toMatch(/planen|i rute/);
    }
  });
});

describe("dagens forslag på startsiden", () => {
  // Planstart tor 26.11.2026, eksamen tor 10.12: G₀ = 1, R₀ = 8, D = 10, ni delkapitler med notater.
  const plan = ok({ courseId: "c1", examDate: "2026-12-10", planStart: "2026-11-26", g0: 1, r0: 8, d: 10 });
  const href = (n: string) => `/emner/c1/delkapitler/${n}`;
  let readyAll: ReadyHashes;
  const show = (day: string, completed: string[] | Record<string, string>, ready: ReadyHashes = readyAll, studyPlan: unknown = plan) => {
    today = day;
    return render(ok(course), ok([course]), ok(chapterWith(9)), ready, ready, completed, studyPlan);
  };
  /** Forslagsseksjonen, eller tom streng når den ikke vises. */
  const suggestionOf = (html: string) => html.match(/<section aria-labelledby="dagens-forslag"[\s\S]*?<\/section>/)?.[0] ?? "";
  const textOf = (html: string) => suggestionOf(html).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
  const startHref = (html: string) => suggestionOf(html).match(/<a [^>]*href="([^"]*)"[^>]*>Start økta<\/a>/)?.[1] ?? null;

  beforeEach(async () => {
    getDataSourceForRender.mockReset();
    const hash = await subchapterInputHash({ learningGoals: "", keyConcepts: "" }, "Notat");
    readyAll = Object.fromEntries(ids(9).map((id) => [id, hash]));
  });

  it("står øverst, over framdriften, med «Start økta» til lesesiden", async () => {
    const html = await show("2026-11-26", ["d1"]);
    expect(textOf(html)).toContain("Dagens forslag");
    expect(textOf(html)).toContain("I kveld: delkapittel 1.2, deretter quiz.");
    expect(suggestionOf(html)).toContain(`href="${href("1.2")}"`);
    expect(startHref(html)).toBe(href("1.2"));
    expect(html.indexOf("dagens-forslag")).toBeLessThan(html.indexOf('aria-label="Framdrift"'));
    // Kapittellisten står fortsatt under, så eieren kan velge selv.
    expect(html.indexOf("dagens-forslag")).toBeLessThan(html.indexOf('id="kapitler"'));
  });

  it("gir ett til ved etterslep", async () => {
    const text = textOf(await show("2026-12-03", ["d1", "d2"]));
    expect(text).toContain("I kveld: delkapittel 1.3 og 1.4, med quiz etter hvert.");
  });

  it("foreslår ingenting på en fleksibel dag i rute", async () => {
    const done = { d1: "2026-11-20T10:00:00Z", d2: "2026-11-27T17:00:00Z", d3: "2026-11-27T18:00:00Z" };
    const html = await show("2026-11-28", done);
    expect(textOf(html)).toContain(flexibleDayMessage);
    expect(startHref(html)).toBeNull();
  });

  it("hopper over delkapitler som ikke er klare", async () => {
    const ready = Object.fromEntries(Object.entries(readyAll).filter(([id]) => id !== "d2"));
    expect(textOf(await show("2026-11-26", ["d1"], ready))).toContain("I kveld: delkapittel 1.3, deretter quiz.");
  });

  it("foreslår et utdatert delkapittel, fordi quizen kan tas", async () => {
    const html = await show("2026-11-26", ["d1"], { ...readyAll, d2: "gammel-hash" });
    expect(textOf(html)).toContain("I kveld: delkapittel 1.2, deretter quiz.");
    expect(startHref(html)).toBe(href("1.2"));
  });

  it("lister tre delkapitler med komma og «og»", () => {
    expect(suggestionText(["2.1", "3.1", "4.1"])).toBe("I kveld: delkapittel 2.1, 3.1 og 4.1, med quiz etter hvert.");
    expect(reviewText(["1.3", "1.1"])).toBe("I kveld: repetisjon med ny quiz på delkapittel 1.3 og 1.1.");
  });

  it("foreslår repetisjon på gjennomførte når ingen ikke-gjennomførte er klare", async () => {
    const done = { d1: "2026-11-21T10:00:00Z", d2: "2026-11-20T10:00:00Z" };
    const html = await show("2026-11-26", done, { d1: readyAll.d1, d2: readyAll.d2 });
    expect(textOf(html)).toContain("I kveld: repetisjon med ny quiz på delkapittel 1.2.");
    expect(startHref(html)).toBe(href("1.2"));
    expect(suggestionOf(html)).not.toContain(completedBadge);
  });

  it("sier fra når ingenting er klart", async () => {
    expect(textOf(await show("2026-11-26", ["d1"], {}))).toContain(nothingReadyMessage);
  });

  it("ligger fast når delkapittelet fullføres i løpet av dagen, og merkes som gjennomført", async () => {
    // 1.2 krysset av kl. 14 i Oslo samme dag.
    const html = await show("2026-11-26", { d1: "2026-11-20T10:00:00Z", d2: "2026-11-26T13:00:00Z" });
    expect(textOf(html)).toContain("I kveld: delkapittel 1.2, deretter quiz.");
    expect(textOf(html)).toContain(completedBadge);
    expect(textOf(html)).toContain(sessionDoneMessage);
    expect(startHref(html)).toBeNull();
  });

  it("lar «Start økta» gå til det neste når det første er gjort i dag", async () => {
    // Etterslep 3.12 gir 1.3 og 1.4. 1.3 er gjort i kveld.
    const html = await show("2026-12-03", { d1: "2026-11-20T10:00:00Z", d2: "2026-11-27T10:00:00Z", d3: "2026-12-03T17:00:00Z" });
    expect(textOf(html)).toContain("I kveld: delkapittel 1.3 og 1.4, med quiz etter hvert.");
    expect(startHref(html)).toBe(href("1.4"));
  });

  it("vises ikke uten plan, eller når planen ikke kan leses", async () => {
    for (const studyPlan of [ok(null), { status: "unavailable" }]) {
      const html = await show("2026-11-26", ["d1"], readyAll, studyPlan);
      expect(suggestionOf(html)).toBe("");
      expect(html).toContain('aria-label="Framdrift"');
    }
  });

  it("vises ikke når delkapitlene ikke kan leses", async () => {
    today = "2026-11-26";
    const html = await render(ok(course), ok([course]), ok(chapterWith(9)), readyAll, readyAll, { status: "unavailable" }, plan);
    expect(suggestionOf(html)).toBe("");
  });
});
