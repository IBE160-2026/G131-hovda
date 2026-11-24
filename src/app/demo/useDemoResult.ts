"use client";

import { useEffect, useState } from "react";
import type { DataSource, Unavailable } from "@/application/dataSource";
import { getDemo } from "@/composition/demo";

/**
 * Kjører `load` med datakilden. Feiler den, også med et unntak før løftet, er svaret `unavailable`,
 * for eksempel når nettleseren mangler `crypto.subtle`.
 */
export async function runDemoLoad<T>(
  load: (data: DataSource) => Promise<T>,
  data: DataSource,
): Promise<T | Unavailable> {
  try {
    return await load(data);
  } catch {
    return { status: "unavailable" };
  }
}

/**
 * Kjører `load` med datakilden i demoen etter at siden er tegnet i nettleseren (AD-3). Gir `null`
 * mens den laster, og `unavailable` hvis lesingen feiler. `load` må være stabil (`useCallback`),
 * for en ny `load` laster på nytt.
 */
export function useDemoResult<T>(load: (data: DataSource) => Promise<T>): T | Unavailable | null {
  const [result, setResult] = useState<{ load: typeof load; value: T | Unavailable } | null>(null);

  useEffect(() => {
    let live = true;
    runDemoLoad(load, getDemo().data).then((value) => {
      if (live) setResult({ load, value });
    });
    return () => {
      live = false;
    };
  }, [load]);

  return result?.load === load ? result.value : null;
}
