import { describe, expect, it, vi } from "vitest";

const signOut = vi.fn(async () => {});
vi.mock("@/composition/server", () => ({ getAuth: async () => ({ signOut }) }));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`redirect:${url}`);
  },
}));

const { logOut } = await import("./actions");

describe("logOut", () => {
  it("logger ut og sender til forsiden", async () => {
    await expect(logOut()).rejects.toThrow(/^redirect:\/$/);
    expect(signOut).toHaveBeenCalledOnce();
  });
});
