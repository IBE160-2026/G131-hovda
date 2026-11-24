import { describe, expect, it } from "vitest";
import { getDemo } from "@/composition/demo";
import { runDemoLoad } from "./useDemoResult";

const data = getDemo().data;

describe("runDemoLoad", () => {
  it("gir svaret fra `load`", async () => {
    expect(await runDemoLoad(async () => ({ status: "ok", value: 1 }), data)).toEqual({ status: "ok", value: 1 });
  });

  it("gir `unavailable` når `load` feiler", async () => {
    expect(await runDemoLoad(() => Promise.reject(new Error("feil")), data)).toEqual({ status: "unavailable" });
  });

  it("gir `unavailable` når `load` kaster før løftet", async () => {
    const load = () => {
      throw new Error("feil");
    };
    expect(await runDemoLoad(load, data)).toEqual({ status: "unavailable" });
  });
});
