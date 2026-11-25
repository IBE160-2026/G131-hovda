import type { Metadata } from "next";
import { getQuiz, type QuizItemView } from "@/application/quiz";
import { getDataSourceForRender } from "@/composition/server";
import { QuizScreen } from "../../../../../../_screens/Quiz";
import { OwnerOnly } from "../../../../../OwnerOnly";
import { reportQuestionLabel } from "../../../../formState";
import { pageMain } from "../../../../styles";
import { answerQuizAction, reportQuizQuestionAction, startQuizAction } from "./actions";
import { ReportForm } from "../ReportForm";

export const metadata: Metadata = {
  title: "Quiz – Studievenn",
};

type Props = PageProps<"/emner/[id]/delkapitler/[nummer]/quiz">;

/**
 * Quizen på et delkapittel (FR-10, FR-14). `nummer` er «n.m» (AD-5). Skjermen deles med demoen
 * (`_screens/Quiz.tsx`). Her får den server actions og feilrapporten på spørsmålet (FR-16).
 */
export default function QuizPage({ params, searchParams }: Props) {
  return (
    <OwnerOnly>
      <main className={pageMain}>
        <QuizContent params={params} searchParams={searchParams} />
      </main>
    </OwnerOnly>
  );
}

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

export async function QuizContent({ params, searchParams }: Pick<Props, "params" | "searchParams">) {
  const { id, nummer } = await params;
  const query = await searchParams;
  const answered = Number(first(query.svar));
  const resultQuizId = first(query.resultat);

  const data = await getDataSourceForRender();
  if (!data) return null;
  const result = await getQuiz(data, id, nummer, {
    answered: Number.isInteger(answered) ? answered : undefined,
    resultQuizId,
  });

  const summaryPath = `/emner/${encodeURIComponent(id)}/delkapitler/${encodeURIComponent(nummer)}`;
  const reportForm = (item: QuizItemView, quizId: string) => (
    <ReportForm
      action={reportQuizQuestionAction.bind(null, id, nummer, quizId, item.position)}
      idPrefix={`meld-${item.position}`}
      label={reportQuestionLabel}
    />
  );
  return (
    <QuizScreen
      result={result}
      error={first(query.feil)}
      reportedNow={first(query.meldt)}
      summaryPath={summaryPath}
      quizPath={`${summaryPath}/quiz`}
      home={{ href: "/start", backLabel: "Til startsiden", linkLabel: "Gå til startsiden" }}
      startAction={startQuizAction.bind(null, id, nummer)}
      answerAction={(quizId, position) => answerQuizAction.bind(null, id, nummer, quizId, position)}
      reportForm={reportForm}
    />
  );
}
