import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const getOwner = vi.fn();
vi.mock("@/composition/server", () => ({ getAuth: async () => ({ getOwner }) }));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`redirect:${url}`);
  },
}));

const { GET } = await import("./route");

function request(next: string) {
  return new NextRequest(`http://localhost/auth/forny?neste=${encodeURIComponent(next)}`);
}

describe("GET /auth/forny", () => {
  beforeEach(() => getOwner.mockReset());

  it("fornyer økta og sender tilbake til siden eieren kom fra", async () => {
    getOwner.mockResolvedValue({ id: "u1", email: "eier@example.no" });
    await expect(GET(request("/start"))).rejects.toThrow("redirect:/start");
  });

  it("sender til forsiden når fornyingen feiler", async () => {
    getOwner.mockResolvedValue(null);
    await expect(GET(request("/start"))).rejects.toThrow("redirect:/");
  });

  it("sender ikke ut av appen", async () => {
    getOwner.mockResolvedValue({ id: "u1", email: "eier@example.no" });
    await expect(GET(request("https://annen.no"))).rejects.toThrow(/^redirect:\/$/);
  });
});
