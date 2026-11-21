import type { Metadata } from "next";
import Link from "next/link";
import { getQuiz, type QuizItemView } from "@/application/quiz";
import { getDataSourceForRender } from "@/composition/server";
import { OwnerOnly } from "../../../../../OwnerOnly";
import {
  alreadyCompletedMessage,
  belowThresholdMessage,
  chooseAnswerMessage,
  completedMessage,
  correctAnswerMessage,
  newQuizLabel,
  quizNotReadyMessage,
  subchapterNotFoundMessage,
  tooFewQuestionsMessage,
  unavailableMessage,
  wrongAnswerMessage,
} from "../../../../formState";
import { pageMain, primaryButton, textLink } from "../../../../styles";
import { answerQuizAction, startQuizAction } from "./actions";

export const metadata: Metadata = {
  title: "Quiz – Studievenn",
};

type Props = PageProps<"/emner/[id]/delkapitler/[nummer]/quiz">;

/**
 * Quizen på et delkapittel (FR-10, FR-14). `nummer` er «n.m» (AD-5). Under resultatet står det om
 * delkapittelet ble krysset av, og under 80 % får eieren tilbud om sammendraget og en ny quiz (FR-15).
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

function Alert({ children }: { children: React.ReactNode }) {
  return (
    <p role="alert" className="font-semibold text-error">
      {children}
    </p>
  );
}

export async function QuizContent({ params, searchParams }: Pick<Props, "params" | "searchParams">) {
  const { id, nummer } = await params;
  const query = await searchParams;
  const answered = Number(first(query.svar));
  const resultQuizId = first(query.resultat);
  const error = first(query.feil);

  const data = await getDataSourceForRender();
  if (!data) return null;
  const result = await getQuiz(data, id, nummer, {
    answered: Number.isInteger(answered) ? answered : undefined,
    resultQuizId,
  });

  const summaryPath = `/emner/${encodeURIComponent(id)}/delkapitler/${encodeURIComponent(nummer)}`;
  const quizPath = `${summaryPath}/quiz`;
  const back = (
    <header>
      <Link href={result.status === "ok" ? summaryPath : "/start"} className={`text-sm ${textLink}`}>
        {result.status === "ok" ? "Til sammendraget" : "Til startsiden"}
      </Link>
    </header>
  );

  if (result.status === "unavailable") {
    return (
      <>
        {back}
        <Alert>{unavailableMessage}</Alert>
      </>
    );
  }
  if (result.status === "notFound" || result.status === "notReady") {
    return (
      <>
        {back}
        <div className="flex flex-col gap-3">
          <p className="text-lg text-muted">
            {result.status === "notFound" ? subchapterNotFoundMessage : quizNotReadyMessage}
          </p>
          <p>
            <Link href="/start" className={textLink}>
              Gå til startsiden
            </Link>
          </p>
        </div>
      </>
    );
  }

  const { chapter, subchapter, total } = result;
  return (
    <>
      {back}
      <article className="flex flex-col gap-6">
        <header className="flex flex-col gap-2">
          <p className="text-sm font-semibold break-words text-muted">
            Kapittel {chapter.number}: {chapter.title}
          </p>
          <h1 className="text-3xl leading-tight font-bold break-words sm:text-4xl">
            Quiz: {subchapter.number} <span className="font-normal">{subchapter.title}</span>
          </h1>
        </header>

        {error === "1" && <Alert>{unavailableMessage}</Alert>}
        {error === "valg" && result.stage === "question" && <Alert>{chooseAnswerMessage}</Alert>}

        {result.stage === "start" &&
          (result.tooFew ? (
            <p className="text-lg text-muted">{tooFewQuestionsMessage}</p>
          ) : (
            <div className="flex flex-col gap-4">
              <p className="text-lg">Quizen har {total} spørsmål fra spørsmålsbanken. Svarene lagres underveis.</p>
              <form action={startQuizAction.bind(null, id, nummer)}>
                <button type="submit" className={primaryButton}>
                  Start quizen
                </button>
              </form>
            </div>
          ))}

        {result.stage === "question" && (
          <form
            action={answerQuizAction.bind(null, id, nummer, result.quizId, result.item.position)}
            className="flex flex-col gap-6"
          >
            <fieldset className="flex min-w-0 flex-col gap-3">
              <legend className="mb-3 flex flex-col gap-2">
                <span className="text-sm font-semibold text-muted">
                  Spørsmål {result.item.position} av {total}
                </span>
                <span className="text-xl font-semibold break-words">{result.item.question}</span>
              </legend>
              {result.item.options.map((option, i) => (
                <label
                  key={i}
                  className="flex min-h-11 cursor-pointer items-start gap-3 rounded-xl border border-muted/40 bg-card px-4 py-3 text-lg break-words has-[:checked]:border-accent has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent"
                >
                  <input type="radio" name="svar" value={i} required className="mt-1.5 size-5 shrink-0 accent-accent" />
                  <span>{option}</span>
                </label>
              ))}
            </fieldset>
            <div>
              <button type="submit" className={primaryButton}>
                Svar
              </button>
            </div>
          </form>
        )}

        {result.stage === "feedback" && (
          <>
            <Feedback item={result.item} total={total} />
            <p>
              <Link href={quizPath} className={primaryButton}>
                Neste spørsmål
              </Link>
            </p>
          </>
        )}

        {result.stage === "unfinished" && (
          <div className="flex flex-col gap-4">
            <p className="text-lg">Alle spørsmålene er besvart.</p>
            <form action={startQuizAction.bind(null, id, nummer)}>
              <button type="submit" className={primaryButton}>
                Se resultatet
              </button>
            </form>
          </div>
        )}

        {result.stage === "result" && (
          <>
            {result.item && <Feedback item={result.item} total={total} />}
            <section aria-labelledby="resultat" className="flex flex-col gap-3 rounded-2xl bg-sky px-6 py-5">
              <h2 id="resultat" className="text-lg font-semibold">
                Resultat
              </h2>
              <p className="text-3xl font-bold">{result.resultText}</p>
              {result.completedBy === "this" && <p className="text-lg font-semibold">{completedMessage}</p>}
              {result.completedBy === "earlier" && <p className="text-lg">{alreadyCompletedMessage}</p>}
            </section>
            {result.passed ? (
              <p>
                <Link href={summaryPath} className={textLink}>
                  Tilbake til sammendraget
                </Link>
              </p>
            ) : (
              <div className="flex flex-col gap-4">
                <p className="max-w-prose text-lg">{belowThresholdMessage}</p>
                <div className="flex flex-wrap items-center gap-x-6 gap-y-4">
                  <form action={startQuizAction.bind(null, id, nummer)}>
                    <button type="submit" className={primaryButton}>
                      {newQuizLabel}
                    </button>
                  </form>
                  <Link href={summaryPath} className={textLink}>
                    Les sammendraget igjen
                  </Link>
                </div>
              </div>
            )}
          </>
        )}
      </article>
    </>
  );
}

/** Svaret eieren ga, om det var riktig, riktig svar og forklaringen. */
function Feedback({ item, total }: { item: QuizItemView; total: number }) {
  const chosen = item.chosenIndex === null ? null : item.options[item.chosenIndex];
  return (
    <section aria-labelledby="tilbakemelding" className="flex flex-col gap-4">
      <p className="text-sm font-semibold text-muted">
        Spørsmål {item.position} av {total}
      </p>
      <p className="text-xl font-semibold break-words">{item.question}</p>
      <div className={`flex flex-col gap-3 rounded-2xl px-6 py-5 ${item.correct ? "bg-mint" : "bg-sun"}`}>
        <h2 id="tilbakemelding" className="text-2xl font-bold">
          {item.correct ? correctAnswerMessage : wrongAnswerMessage}
        </h2>
        {!item.correct && (
          <dl className="flex flex-col gap-2 text-lg break-words">
            <div>
              <dt className="inline font-semibold">Du svarte: </dt>
              <dd className="inline">{chosen}</dd>
            </div>
            <div>
              <dt className="inline font-semibold">Riktig svar: </dt>
              <dd className="inline">{item.options[item.correctIndex]}</dd>
            </div>
          </dl>
        )}
        <p className="max-w-prose text-lg leading-relaxed break-words">{item.explanation}</p>
      </div>
    </section>
  );
}
