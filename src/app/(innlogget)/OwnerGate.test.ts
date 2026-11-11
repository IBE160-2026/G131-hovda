import { beforeEach, describe, expect, it, vi } from "vitest";
import { isValidElement } from "react";

const getOwnerForRender = vi.fn();
vi.mock("@/composition/server", () => ({ getOwnerForRender }));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`redirect:${url}`);
  },
}));

const { OwnerGate } = await import("./OwnerGate");
const { RefreshSession } = await import("./RefreshSession");

describe("OwnerGate", () => {
  beforeEach(() => getOwnerForRender.mockReset());

  it("viser siden for en innlogget eier", async () => {
    getOwnerForRender.mockResolvedValue({
      owner: { id: "u1", email: "eier@example.no" },
      refreshPending: false,
    });
    expect(await OwnerGate({ children: "innhold" })).toBe("innhold");
  });

  it("sender uinnloggede til forsiden", async () => {
    getOwnerForRender.mockResolvedValue({ owner: null, refreshPending: false });
    await expect(OwnerGate({ children: "innhold" })).rejects.toThrow(/^redirect:\/$/);
  });

  it("sender innom fornyingsruten når tokenet ble fornyet under visningen", async () => {
    getOwnerForRender.mockResolvedValue({
      owner: { id: "u1", email: "eier@example.no" },
      refreshPending: true,
    });
    const result = await OwnerGate({ children: "innhold" });
    expect(isValidElement(result) && result.type).toBe(RefreshSession);
    // Innholdet følger med, så RefreshSession kan vise siden hvis fornyingen går i ring.
    expect(isValidElement<{ children: unknown }>(result) && result.props.children).toBe(
      "innhold",
    );
  });
});
