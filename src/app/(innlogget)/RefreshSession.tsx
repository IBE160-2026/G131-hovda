"use client";

import { useEffect, useState } from "react";

const lastAttemptKey = "studievenn:forny";
const minimumGapMs = 30_000;

// Sender eieren innom fornyingsruten med stien de står på, så de kommer tilbake hit etterpå.
// Er JWT-utløpet i Supabase 90 s eller lavere, regner supabase-js også det nye tokenet som
// utløpt, og runden ville aldri stoppet. Derfor prøver vi bare én gang per 30 s, og ellers
// vises siden. Eieren er alt verifisert på serveren.
export function RefreshSession({ children }: { children: React.ReactNode }) {
  const [showPage, setShowPage] = useState(false);

  useEffect(() => {
    if (!shouldTryRefresh()) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- sessionStorage finnes bare i nettleseren
      setShowPage(true);
      return;
    }
    const next = window.location.pathname + window.location.search;
    window.location.replace(`/auth/forny?neste=${encodeURIComponent(next)}`);
  }, []);

  if (showPage) return children;
  return <p className="px-4 py-12 text-center text-muted">Fornyer innloggingen …</p>;
}

function shouldTryRefresh(): boolean {
  try {
    const last = Number(window.sessionStorage.getItem(lastAttemptKey)) || 0;
    if (Date.now() - last < minimumGapMs) return false;
    window.sessionStorage.setItem(lastAttemptKey, String(Date.now()));
    return true;
  } catch {
    // Uten sessionStorage kan vi ikke stoppe en runde, så vi viser siden.
    return false;
  }
}
