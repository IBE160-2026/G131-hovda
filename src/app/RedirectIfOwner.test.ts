import { beforeEach, describe, expect, it, vi } from "vitest";

const getOwnerForRender = vi.fn();
vi.mock("@/composition/server", () => ({ getOwnerForRender }));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`redirect:${url}`);
  },
}));

const { RedirectIfOwner } = await import("./RedirectIfOwner");

describe("RedirectIfOwner", () => {
  beforeEach(() => getOwnerForRender.mockReset());

  it("sender en innlogget eier til startsiden", async () => {
    getOwnerForRender.mockResolvedValue({
      owner: { id: "u1", email: "eier@example.no" },
      refreshPending: false,
    });
    await expect(RedirectIfOwner()).rejects.toThrow(/^redirect:\/start$/);
  });

  it("lar uinnloggede bli på siden", async () => {
    getOwnerForRender.mockResolvedValue({ owner: null, refreshPending: false });
    expect(await RedirectIfOwner()).toBeNull();
  });
});
