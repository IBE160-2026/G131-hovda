"use client";

import { useEffect } from "react";

// Sender eieren innom fornyingsruten med stien de står på, så de kommer tilbake hit etterpå.
export function RefreshSession() {
  useEffect(() => {
    const next = window.location.pathname + window.location.search;
    window.location.replace(`/auth/forny?neste=${encodeURIComponent(next)}`);
  }, []);

  return <p className="px-4 py-12 text-center text-muted">Fornyer innloggingen …</p>;
}
