// Sjekker RLS og GRANT for courses, user_settings, chapters, subchapters, summary_versions,
// question_bank_versions, themes, quiz_questions, sessions, quizzes, quiz_items og subchapter_completions mot
// Supabase-prosjektet dev (AD-10), og quizmetodene i adapteren med testkontoens egne data.
// Kjøres bare med `npm run test:dev`. Krever en testkonto i dev som ikke er eieren:
// RLS_TEST_EMAIL og RLS_TEST_PASSWORD i .env.local, i tillegg til Supabase-nøklene.
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { SupabaseDataSource } from "./dataSource";

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Mangler ${name} i .env.local. Se README og .env.example.`);
  return value;
}

const url = required("NEXT_PUBLIC_SUPABASE_URL");
const anonKey = required("NEXT_PUBLIC_SUPABASE_ANON_KEY");

function newClient(): SupabaseClient {
  return createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

describe("RLS i dev", () => {
  const testUser = newClient();
  let testUserId = "";
  const createdIds: string[] = [];

  beforeAll(async () => {
    const { data, error } = await testUser.auth.signInWithPassword({
      email: required("RLS_TEST_EMAIL"),
      password: required("RLS_TEST_PASSWORD"),
    });
    if (error || !data.user) throw new Error(`Testkontoen kom ikke inn: ${error?.message}`);
    testUserId = data.user.id;
  });

  afterAll(async () => {
    if (createdIds.length > 0) await testUser.from("courses").delete().in("id", createdIds);
    await testUser.auth.signOut();
  });

  it("gir testkontoen ingen av eierens emner", async () => {
    const { data, error } = await testUser.from("courses").select("id, owner_id");
    expect(error).toBeNull();
    expect(data?.filter((row) => row.owner_id !== testUserId)).toEqual([]);
  });

  it("gir testkontoen ingen av eierens innstillinger", async () => {
    const { data, error } = await testUser.from("user_settings").select("owner_id");
    expect(error).toBeNull();
    expect(data?.filter((row) => row.owner_id !== testUserId)).toEqual([]);
  });

  it("lar testkontoen lage og se sitt eget emne, med seg selv som eier", async () => {
    const code = `RLS${Date.now().toString(36).toUpperCase()}`.slice(0, 20);
    const { data, error } = await testUser
      .from("courses")
      .insert({ code, name: "RLS-test" })
      .select("id, owner_id")
      .single();
    expect(error).toBeNull();
    createdIds.push(data!.id);
    expect(data!.owner_id).toBe(testUserId);

    const { data: seen } = await testUser.from("courses").select("id").eq("id", data!.id);
    expect(seen).toHaveLength(1);
  });

  it("stopper et emne med en annen eier", async () => {
    const { error } = await testUser
      .from("courses")
      .insert({ owner_id: "00000000-0000-0000-0000-000000000000", code: "RLSANNEN", name: "x" });
    expect(error?.code).toBe("42501");
  });

  it("stopper samme kode med andre store/små bokstaver", async () => {
    const code = `DUP${Date.now().toString(36).toUpperCase()}`.slice(0, 20);
    const first = await testUser.from("courses").insert({ code, name: "a" }).select("id").single();
    expect(first.error).toBeNull();
    createdIds.push(first.data!.id);
    const second = await testUser
      .from("courses")
      .insert({ code: code.toLowerCase(), name: "b" })
      .select("id");
    for (const row of second.data ?? []) createdIds.push(row.id);
    expect(second.error?.code).toBe("23505");
  });

  it("tømmer aktivt emne, men beholder innstillingene, når emnet slettes", async () => {
    const code = `DEL${Date.now().toString(36).toUpperCase()}`.slice(0, 20);
    const created = await testUser.from("courses").insert({ code, name: "Slettes" }).select("id").single();
    expect(created.error).toBeNull();
    const id = created.data!.id;
    createdIds.push(id);

    const upsert = await testUser
      .from("user_settings")
      .upsert({ owner_id: testUserId, active_course_id: id }, { onConflict: "owner_id" });
    expect(upsert.error).toBeNull();

    const deleted = await testUser.from("courses").delete().eq("id", id);
    expect(deleted.error).toBeNull();

    const settings = await testUser
      .from("user_settings")
      .select("owner_id, active_course_id")
      .eq("owner_id", testUserId);
    expect(settings.error).toBeNull();
    expect(settings.data).toEqual([{ owner_id: testUserId, active_course_id: null }]);
  });

  it("gir testkontoen ingen av eierens kapitler eller delkapitler", async () => {
    const chapters = await testUser.from("chapters").select("id, owner_id");
    const subchapters = await testUser.from("subchapters").select("id, owner_id");
    expect(chapters.error).toBeNull();
    expect(subchapters.error).toBeNull();
    expect(chapters.data?.filter((row) => row.owner_id !== testUserId)).toEqual([]);
    expect(subchapters.data?.filter((row) => row.owner_id !== testUserId)).toEqual([]);
  });

  it("stopper et kapittel med en annen eier", async () => {
    const { error } = await testUser.from("chapters").insert({
      owner_id: "00000000-0000-0000-0000-000000000000",
      course_id: "00000000-0000-0000-0000-000000000000",
      number: 1,
      title: "x",
    });
    expect(error?.code).toBe("42501");
  });

  it("gir testkontoen ingen av eierens sammendragsversjoner", async () => {
    const { data, error } = await testUser.from("summary_versions").select("id, owner_id");
    expect(error).toBeNull();
    expect(data?.filter((row) => row.owner_id !== testUserId)).toEqual([]);
  });

  it("stopper en sammendragsversjon med en annen eier", async () => {
    const { error } = await testUser.from("summary_versions").insert({
      owner_id: "00000000-0000-0000-0000-000000000000",
      subchapter_id: "00000000-0000-0000-0000-000000000000",
      status: "klart",
      text: "x",
      model_id: "anthropic.claude-sonnet-5-5",
      prompt_version: "summary.v1",
      input_hash: "h",
    });
    expect(error?.code).toBe("42501");
  });

  it("gir testkontoen ingen av eierens bankversjoner, temaer eller quizspørsmål", async () => {
    for (const table of ["question_bank_versions", "themes", "quiz_questions"]) {
      const { data, error } = await testUser.from(table).select("id, owner_id");
      expect(error).toBeNull();
      expect(data?.filter((row) => row.owner_id !== testUserId)).toEqual([]);
    }
  });

  it("stopper en bankversjon og et tema med en annen eier", async () => {
    const other = "00000000-0000-0000-0000-000000000000";
    const version = await testUser.from("question_bank_versions").insert({
      owner_id: other,
      subchapter_id: other,
      status: "lages",
      model_id: "claude-code/test",
      prompt_version: "innhold.v2",
      input_hash: "h",
      content_hash: "c",
    });
    expect(version.error?.code).toBe("42501");
    const theme = await testUser.from("themes").insert({ owner_id: other, subchapter_id: other, name: "Tema" });
    expect(theme.error?.code).toBe("42501");
    const question = await testUser.from("quiz_questions").insert({
      owner_id: other,
      subchapter_id: other,
      bank_version_id: other,
      theme_id: other,
      position: 1,
      question: "Hva?",
      options: ["A", "B", "C", "D"],
      correct_index: 0,
      explanation: "Fordi.",
    });
    expect(question.error?.code).toBe("42501");
  });

  it("gir testkontoen ingen av eierens økter, quizer eller quizelementer", async () => {
    for (const table of ["sessions", "quizzes", "quiz_items"]) {
      const { data, error } = await testUser.from(table).select("id, owner_id");
      expect(error).toBeNull();
      expect(data?.filter((row) => row.owner_id !== testUserId)).toEqual([]);
    }
  });

  it("stopper en økt, en quiz og et quizelement med en annen eier", async () => {
    const other = "00000000-0000-0000-0000-000000000000";
    const session = await testUser.from("sessions").insert({ owner_id: other });
    expect(session.error?.code).toBe("42501");
    const quiz = await testUser.from("quizzes").insert({ owner_id: other, session_id: other, subchapter_id: other });
    expect(quiz.error?.code).toBe("42501");
    const item = await testUser
      .from("quiz_items")
      .insert({ owner_id: other, quiz_id: other, position: 1, question_id: other });
    expect(item.error?.code).toBe("42501");
  });

  it("tar en quiz gjennom adapteren med testkontoens egne data", async () => {
    const code = `QZ${Date.now().toString(36).toUpperCase()}`.slice(0, 20);
    const course = await testUser.from("courses").insert({ code, name: "Quiztest" }).select("id").single();
    expect(course.error).toBeNull();
    createdIds.push(course.data!.id);
    const chapter = await testUser
      .from("chapters")
      .insert({ course_id: course.data!.id, number: 1, title: "Kapittel" })
      .select("id")
      .single();
    expect(chapter.error).toBeNull();
    const sub = await testUser
      .from("subchapters")
      .insert({ chapter_id: chapter.data!.id, number: "1.1", position: 1, title: "Del", note_text: "Notat" })
      .select("id")
      .single();
    expect(sub.error).toBeNull();
    const subchapterId = sub.data!.id;

    const data = new SupabaseDataSource(testUser, testUserId);
    const bank = await data.addQuestionBank({
      subchapterId,
      modelId: "claude-code/test",
      promptVersion: "innhold.v2",
      inputHash: "h",
      contentHash: "c",
      themes: ["Alfa", "Beta"],
      questions: Array.from({ length: 12 }, (_, i) => ({
        question: `Spørsmål ${i + 1}?`,
        options: ["A", "B", "C", "D"],
        correctIndex: 1,
        explanation: "Fordi.",
        theme: i < 6 ? "Alfa" : "Beta",
        sourceNumber: null,
        originalText: null,
      })),
    });
    expect(bank.status).toBe("ok");

    const questions = await data.listQuizBank(subchapterId);
    if (questions.status !== "ok") throw new Error("banken kunne ikke leses");
    expect(questions.value).toHaveLength(12);

    const sessionsBefore = await testUser.from("sessions").select("id").eq("owner_id", testUserId);
    const created = await data.createQuiz({ subchapterId, questionIds: questions.value.slice(0, 10).map((q) => q.id) });
    if (created.status !== "ok") throw new Error(`quizen ble ikke laget: ${created.status}`);
    const quiz = created.value;
    expect(quiz.items.map((i) => i.position)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(quiz.items[0].question).toEqual(questions.value[0]);
    expect(await data.createQuiz({ subchapterId, questionIds: [questions.value[0].id] })).toEqual({ status: "duplicate" });
    // create_quiz er én transaksjon: den mislykkede starten etterlot ingen økt.
    const sessions = await testUser.from("sessions").select("id").eq("owner_id", testUserId);
    expect(sessions.data?.map((s) => s.id).sort()).toEqual(
      [...(sessionsBefore.data ?? []).map((s) => s.id), quiz.sessionId].sort(),
    );
    // Uinnloggede kan ikke kalle funksjonene.
    const anonCall = await newClient().rpc("create_quiz", { p_subchapter_id: subchapterId, p_question_ids: [] });
    expect(anonCall.error?.code).toBe("42501");

    expect(await data.answerQuizItem(quiz.items[0].id, 0, false)).toEqual({ status: "ok", value: true });
    expect(await data.answerQuizItem(quiz.items[0].id, 1, true)).toEqual({ status: "ok", value: false });
    // Svaret er fryst også for en direkte endring.
    const changedItem = await testUser.from("quiz_items").update({ correct: true }).eq("id", quiz.items[0].id);
    expect(changedItem.error?.code).toBe("23514");
    expect(await data.replaceQuizItem(quiz.items[9].id, questions.value[10].id)).toEqual({ status: "ok", value: true });
    expect(await data.replaceQuizItem(quiz.items[0].id, questions.value[11].id)).toEqual({ status: "ok", value: false });

    const listed = await data.listQuizzes(subchapterId);
    if (listed.status !== "ok") throw new Error("quizene kunne ikke leses");
    const items = listed.value[0].items;
    expect(items.filter((i) => i.position === 10).map((i) => [i.status, i.question.id])).toEqual([
      ["erstattet", questions.value[9].id],
      ["aktiv", questions.value[10].id],
    ]);
    expect(items[0]).toMatchObject({ chosenIndex: 0, correct: false, answeredAt: expect.any(String) });

    expect(await data.saveQuizResult(quiz.id, { correctCount: 7, carryThemeId: null, completes: false })).toEqual({
      status: "ok",
      value: true,
    });
    expect(await data.saveQuizResult(quiz.id, { correctCount: 10, carryThemeId: null, completes: true })).toEqual({
      status: "ok",
      value: false,
    });
    // Under 80 %: ingen avkrysning, heller ikke av det andre kallet, som ikke endret noe.
    expect(await data.listCompletions([subchapterId])).toEqual({ status: "ok", value: [] });
    // Resultatet er fryst også for en direkte endring.
    const changed = await testUser.from("quizzes").update({ correct_count: 10 }).eq("id", quiz.id);
    expect(changed.error?.code).toBe("23514");
    const finished = await data.listQuizzes(subchapterId);
    if (finished.status !== "ok") throw new Error("quizene kunne ikke leses");
    expect(finished.value[0]).toMatchObject({ status: "ferdig", correctCount: 7, total: 10 });

    await testUser.from("sessions").delete().eq("id", quiz.sessionId);
  });

  it("gir testkontoen ingen av eierens avkrysninger", async () => {
    const { data, error } = await testUser.from("subchapter_completions").select("id, owner_id");
    expect(error).toBeNull();
    expect(data?.filter((row) => row.owner_id !== testUserId)).toEqual([]);
  });

  it("stopper en avkrysning med en annen eier", async () => {
    const other = "00000000-0000-0000-0000-000000000000";
    const { error } = await testUser
      .from("subchapter_completions")
      .insert({ owner_id: other, subchapter_id: other, quiz_id: other });
    expect(error?.code).toBe("42501");
  });

  it("krysser av med finish_quiz, lar avkrysningen stå og sletter den bare med emnet", async () => {
    const code = `FQ${Date.now().toString(36).toUpperCase()}`.slice(0, 20);
    const course = await testUser.from("courses").insert({ code, name: "Avkrysning" }).select("id").single();
    expect(course.error).toBeNull();
    const courseId = course.data!.id;
    createdIds.push(courseId);
    const chapter = await testUser
      .from("chapters")
      .insert({ course_id: courseId, number: 1, title: "Kapittel" })
      .select("id")
      .single();
    expect(chapter.error).toBeNull();
    const sub = await testUser
      .from("subchapters")
      .insert({ chapter_id: chapter.data!.id, number: "1.1", position: 1, title: "Del", note_text: "Notat" })
      .select("id")
      .single();
    expect(sub.error).toBeNull();
    const subchapterId = sub.data!.id;

    const data = new SupabaseDataSource(testUser, testUserId);
    const bank = await data.addQuestionBank({
      subchapterId,
      modelId: "claude-code/test",
      promptVersion: "innhold.v2",
      inputHash: "h",
      contentHash: "c",
      themes: ["Alfa"],
      questions: Array.from({ length: 10 }, (_, i) => ({
        question: `Spørsmål ${i + 1}?`,
        options: ["A", "B", "C", "D"],
        correctIndex: 0,
        explanation: "Fordi.",
        theme: "Alfa",
        sourceNumber: null,
        originalText: null,
      })),
    });
    expect(bank.status).toBe("ok");
    const questions = await data.listQuizBank(subchapterId);
    if (questions.status !== "ok") throw new Error("banken kunne ikke leses");
    const questionIds = questions.value.map((q) => q.id);

    // Første quiz: 8 av 10 krysser av, med quizens id.
    const first = await data.createQuiz({ subchapterId, questionIds });
    if (first.status !== "ok") throw new Error(`quizen ble ikke laget: ${first.status}`);
    expect(await data.saveQuizResult(first.value.id, { correctCount: 8, carryThemeId: null, completes: true })).toEqual({
      status: "ok",
      value: true,
    });
    const completed = await data.listCompletions([subchapterId]);
    if (completed.status !== "ok") throw new Error("avkrysningene kunne ikke leses");
    expect(completed.value).toEqual([{ subchapterId, quizId: first.value.id, completedAt: expect.any(String) }]);
    const quizRow = await testUser.from("quizzes").select("finished_at").eq("id", first.value.id).single();
    expect(new Date(completed.value[0].completedAt).getTime()).toBe(new Date(quizRow.data!.finished_at).getTime());

    // Andre quiz med 10 av 10: ingen ny rad, og tidspunkt og quiz-ID er uendret.
    const second = await data.createQuiz({ subchapterId, questionIds });
    if (second.status !== "ok") throw new Error(`quizen ble ikke laget: ${second.status}`);
    expect(await data.saveQuizResult(second.value.id, { correctCount: 10, carryThemeId: null, completes: true })).toEqual({
      status: "ok",
      value: true,
    });
    expect(await data.listCompletions([subchapterId])).toEqual(completed);

    // Avkrysningen kan verken endres eller slettes av den innloggede.
    const id = completed.value[0];
    const updated = await testUser
      .from("subchapter_completions")
      .update({ quiz_id: second.value.id })
      .eq("subchapter_id", subchapterId)
      .select("id");
    expect(updated.error?.code).toBe("42501");
    const deleted = await testUser.from("subchapter_completions").delete().eq("subchapter_id", subchapterId).select("id");
    expect(deleted.error?.code).toBe("42501");
    expect(await data.listCompletions([subchapterId])).toEqual({ status: "ok", value: [id] });

    // Uinnloggede kan ikke kalle funksjonen.
    const anonCall = await newClient().rpc("finish_quiz", {
      p_quiz_id: first.value.id,
      p_correct_count: 10,
      p_carry_theme_id: null,
      p_completes: true,
    });
    expect(anonCall.error?.code).toBe("42501");

    // Raden forsvinner med emnet (cascade via delkapittelet).
    const removed = await testUser.from("courses").delete().eq("id", courseId);
    expect(removed.error).toBeNull();
    const after = await testUser.from("subchapter_completions").select("id").eq("subchapter_id", subchapterId);
    expect(after.error).toBeNull();
    expect(after.data).toEqual([]);
  });

  it("gir uinnloggede ingen tilgang til tabellene", async () => {
    const anon = newClient();
    const courses = await anon.from("courses").select("id");
    const settings = await anon.from("user_settings").select("owner_id");
    expect(courses.error?.code).toBe("42501");
    expect(settings.error?.code).toBe("42501");
    for (const table of [
      "chapters",
      "subchapters",
      "summary_versions",
      "question_bank_versions",
      "themes",
      "quiz_questions",
      "sessions",
      "quizzes",
      "quiz_items",
      "subchapter_completions",
    ]) {
      const { error } = await anon.from(table).select("id");
      expect(error?.code).toBe("42501");
    }
  });
});
