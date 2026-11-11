import { beforeEach, describe, expect, it, vi } from "vitest";

const signIn = vi.fn();
vi.mock("@/composition/server", () => ({ getAuth: async () => ({ signIn }) }));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`redirect:${url}`);
  },
}));

const { logIn } = await import("./actions");

function form(email: string, password: string) {
  const data = new FormData();
  data.set("email", email);
  data.set("password", password);
  return data;
}

const initial = { email: "", error: null };

describe("logIn", () => {
  beforeEach(() => signIn.mockReset());

  it("sender til startsiden ved riktig innlogging", async () => {
    signIn.mockResolvedValue("ok");
    await expect(logIn(initial, form("eier@example.no", "riktig"))).rejects.toThrow(
      "redirect:/start",
    );
  });

  it("gir felles feilmelding og beholder e-posten ved feil passord eller ukjent e-post", async () => {
    signIn.mockResolvedValue("invalid");
    expect(await logIn(initial, form(" eier@example.no ", "feil"))).toEqual({
      email: "eier@example.no",
      error: "Feil e-post eller passord.",
    });
  });

  it("sier fra når Supabase ikke svarer", async () => {
    signIn.mockResolvedValue("unavailable");
    expect(await logIn(initial, form("eier@example.no", "riktig"))).toEqual({
      email: "eier@example.no",
      error: "Innloggingen virker ikke akkurat nå. Prøv igjen senere.",
    });
  });
});
