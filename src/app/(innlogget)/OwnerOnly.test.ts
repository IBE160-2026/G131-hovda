import { beforeEach, describe, expect, it, vi } from "vitest";

const getOwnerForRender = vi.fn();
vi.mock("@/composition/server", () => ({ getOwnerForRender }));

const { OwnerCheck } = await import("./OwnerOnly");

describe("OwnerCheck", () => {
  beforeEach(() => getOwnerForRender.mockReset());

  it("viser innholdet for en verifisert eier", async () => {
    getOwnerForRender.mockResolvedValue({
      owner: { id: "u1", email: "eier@example.no" },
      refreshPending: false,
    });
    expect(await OwnerCheck({ children: "innhold" })).toBe("innhold");
  });

  it("viser ingenting uten eier", async () => {
    getOwnerForRender.mockResolvedValue({ owner: null, refreshPending: false });
    expect(await OwnerCheck({ children: "innhold" })).toBeNull();
  });
});
