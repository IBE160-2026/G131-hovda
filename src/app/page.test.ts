import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

vi.mock("./RedirectIfOwner", () => ({ RedirectIfOwner: () => null }));

const { default: Home } = await import("./page");

describe("forsiden", () => {
  it("lenker til demoen ved siden av «Logg inn» (FR-26)", () => {
    const html = renderToStaticMarkup(Home());
    expect(html).toMatch(/<a [^>]*href="\/demo"[^>]*>Prøv demoen<\/a>/);
    expect(html).toMatch(/<a [^>]*href="\/logg-inn"[^>]*>Logg inn<\/a>/);
  });
});
