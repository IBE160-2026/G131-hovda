"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { use, useCallback, useState } from "react";
import type { DataSource } from "@/application/dataSource";
import { answerQuiz, getQuiz, startQuiz, type GetQuizResult } from "@/application/quiz";
import { getDemo } from "@/composition/demo";
import { QuizScreen } from "../../../../../../_screens/Quiz";
import { Loading } from "../../../../../Loading";
import { runDemoLoad, useDemoResult } from "../../../../../useDemoResult";

/** Lesesiden for delkapittelet i demoen. */
export function demoSummaryPath(id: string, nummer: string): string {
  return `/demo/emner/${encodeURIComponent(id)}/delkapitler/${encodeURIComponent(nummer)}`;
}

export function demoQuizPath(id: string, nummer: string, query = ""): string {
  return `${demoSummaryPath(id, nummer)}/quiz${query}`;
}

/** Tallet i feltet `svar`, eller `null` når det mangler. Gyldigheten sjekkes av `answerQuiz`. */
function readChoice(formData: FormData): number | null {
  const value = formData.get("svar");
  if (typeof value !== "string" || value.trim() === "") return null;
  return Number(value);
}

/**
 * Starter eller fortsetter quizen og gir adressen siden skal til, som `startQuizAction` i appen:
 * resultatet når quizen ble avsluttet, `?feil=1` når det feilet, ellers quizen.
 */
export async function startDemoQuiz(data: DataSource, id: string, nummer: string): Promise<string> {
  const result = await runDemoLoad((d) => startQuiz(d, id, nummer), data);
  if (result.status === "unavailable") return demoQuizPath(id, nummer, "?feil=1");
  if (result.status === "ok" && result.finished) {
    return demoQuizPath(id, nummer, `?resultat=${encodeURIComponent(result.quizId)}`);
  }
  return demoQuizPath(id, nummer);
}

/** Lagrer svaret og gir adressen siden skal til, som `answerQuizAction` i appen. */
export async function answerDemoQuiz(
  data: DataSource,
  id: string,
  nummer: string,
  quizId: string,
  position: number,
  formData: FormData,
): Promise<string> {
  const result = await runDemoLoad((d) => answerQuiz(d, id, nummer, quizId, position, readChoice(formData)), data);
  if (result.status === "unavailable") return demoQuizPath(id, nummer, "?feil=1");
  if (result.status === "invalid") return demoQuizPath(id, nummer, "?feil=valg");
  if (result.status === "ok" && result.finished) {
    return demoQuizPath(id, nummer, `?resultat=${encodeURIComponent(result.quizId)}`);
  }
  if (result.status === "ok" && result.feedbackPosition !== null) {
    return demoQuizPath(id, nummer, `?svar=${result.feedbackPosition}`);
  }
  return demoQuizPath(id, nummer);
}

/**
 * Går til `url` etter en handling. Er det adressen siden alt har, lastes quizen på nytt med `reload`,
 * for da endres ingen spørringsparametere.
 */
export function useDemoNavigate(reload?: () => void) {
  const router = useRouter();
  return useCallback(
    (url: string) => {
      const here = `${window.location.pathname}${window.location.search}`;
      if (url === here && reload) reload();
      else router.push(url);
    },
    [router, reload],
  );
}

/** Quizen i demoen. Handlingene kjører brukstilfellene i nettleseren, og siden lastes på nytt etter hver. */
export function DemoQuiz({ params }: { params: Promise<{ id: string; nummer: string }> }) {
  const { id, nummer } = use(params);
  const query = useSearchParams();
  const answered = Number(query.get("svar") ?? undefined);
  const resultQuizId = query.get("resultat") ?? undefined;
  const [round, setRound] = useState(0);
  const reload = useCallback(() => setRound((r) => r + 1), []);
  const navigate = useDemoNavigate(reload);

  // `round` er med så quizen leses på nytt etter en handling som ikke endrer adressen.
  const load = useCallback(
    (data: DataSource) =>
      getQuiz(data, id, nummer, { answered: Number.isInteger(answered) ? answered : undefined, resultQuizId }),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `round` gir en ny `load`, så quizen leses på nytt.
    [id, nummer, answered, resultQuizId, round],
  );
  const result = useDemoResult(load);

  return (
    <DemoQuizView
      id={id}
      nummer={nummer}
      result={result}
      error={query.get("feil") ?? undefined}
      startAction={async () => navigate(await startDemoQuiz(getDemo().data, id, nummer))}
      answerAction={(quizId, position) => async (formData) =>
        navigate(await answerDemoQuiz(getDemo().data, id, nummer, quizId, position, formData))
      }
    />
  );
}

type ViewProps = {
  id: string;
  nummer: string;
  result: GetQuizResult | null;
  error?: string;
  startAction: (formData: FormData) => void | Promise<void>;
  answerAction: (quizId: string, position: number) => (formData: FormData) => void | Promise<void>;
};

/** Quizskjermen fra appen, uten feilrapport, med lenkene i demoen. */
export function DemoQuizView({ id, nummer, result, error, startAction, answerAction }: ViewProps) {
  if (!result) return <Loading />;
  return (
    <QuizScreen
      result={result}
      error={error}
      summaryPath={demoSummaryPath(id, nummer)}
      quizPath={demoQuizPath(id, nummer)}
      home={{ href: `/demo/emner/${encodeURIComponent(id)}`, backLabel: "Til kapitlene", linkLabel: "Gå til kapitlene" }}
      startAction={startAction}
      answerAction={answerAction}
    />
  );
}
