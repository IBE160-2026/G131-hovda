import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { CourseCard } from "./CourseCard";

const course = { code: "IBE430", name: "Forretningsprosesser og ERP" };
const render = (props: { active?: boolean; href?: string }, ...children: string[]) =>
  renderToStaticMarkup(createElement(CourseCard, { course, ...props }, ...children));

describe("CourseCard", () => {
  it("merker aktivt emne med aria-current og «Aktivt emne»", () => {
    const html = render({ active: true });
    expect(html).toContain('aria-current="true"');
    expect(html).toContain("Aktivt emne");
    expect(html).toContain("ring-accent");
  });

  it("har ikke merket uten `active`", () => {
    const html = render({});
    expect(html).not.toContain("aria-current");
    expect(html).not.toContain("Aktivt emne");
  });

  it("gjør overskriften til en lenke med `href`", () => {
    expect(render({ href: "/demo/emner/demo-ibe430" })).toMatch(
      /<h2[^>]*><a [^>]*href="\/demo\/emner\/demo-ibe430"[^>]*>IBE430 /,
    );
    expect(render({})).not.toContain("<a ");
  });

  it("viser children i raden med knapper", () => {
    const html = render({}, "Velg");
    expect(html).toMatch(/<div class="flex flex-wrap items-center gap-4">Velg<\/div>/);
  });
});
