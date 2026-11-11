import { describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

vi.mock("./actions", () => ({ logIn: async () => ({ email: "", error: null }) }));

const { LoginForm } = await import("./LoginForm");

describe("LoginForm", () => {
  const html = renderToStaticMarkup(createElement(LoginForm));

  it("har merkede felt for e-post og passord", () => {
    expect(html).toContain('<label for="email"');
    expect(html).toContain('<label for="password"');
  });

  it("krever begge feltene, så nettleseren stopper tom innsending", () => {
    expect(html).toMatch(/<input[^>]*id="email"[^>]*required/);
    expect(html).toMatch(/<input[^>]*id="password"[^>]*required/);
  });

  it("har ingen lenke til registrering", () => {
    expect(html).not.toMatch(/registrer/i);
  });
});
