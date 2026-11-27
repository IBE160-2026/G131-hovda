// Kjører `sync_review_questions` og `listReviewQuestions` mot Supabase-prosjektet dev, med service
// role som importen (story 4.1). Kjøres bare med `npm run test:dev`. Krever Supabase-nøklene og
// testkontoen (RLS_TEST_EMAIL og RLS_TEST_PASSWORD) i .env.local, og SUPABASE_SERVICE_ROLE_KEY i
// .env.local eller i .env.dev.local, som importen bruker mot dev.
// Testkontoen eier emnet og kapittelet, og alt slettes med emnet til slutt.
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { parseEnv } from "node:util";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { SupabaseDataSource } from "./dataSource";

// Nøklene importen bruker mot dev, som reserve når .env.local mangler service-nøkkelen.
const importEnvFile = join(process.cwd(), ".env.dev.local");
const importEnv: Record<string, string | undefined> = existsSync(importEnvFile)
  ? parseEnv(readFileSync(importEnvFile, "utf8"))
  : {};

function required(name: string): string {
  const value = process.env[name] || importEnv[name];
  if (!value) throw new Error(`Mangler ${name} i .env.local. Se README og .env.example.`);
  return value;
}

const url = required("NEXT_PUBLIC_SUPABASE_URL");
const options = { auth: { persistSession: false, autoRefreshToken: false } };

type Row = { id: string; position: number; text: string; status: string; retired_at: string | null; updated_at: string };

describe("sync_review_questions i dev", () => {
  const testUser: SupabaseClient = createClient(url, required("NEXT_PUBLIC_SUPABASE_ANON_KEY"), options);
  const service: SupabaseClient = createClient(url, required("SUPABASE_SERVICE_ROLE_KEY"), options);
  let testUserId = "";
  let courseId = "";
  let chapterId = "";
  let data: SupabaseDataSource;

  beforeAll(async () => {
    const signIn = await testUser.auth.signInWithPassword({
      email: required("RLS_TEST_EMAIL"),
      password: required("RLS_TEST_PASSWORD"),
    });
    if (signIn.error || !signIn.data.user) throw new Error(`Testkontoen kom ikke inn: ${signIn.error?.message}`);
    testUserId = signIn.data.user.id;
    const code = `GQ${Date.now().toString(36).toUpperCase()}`.slice(0, 20);
    const course = await testUser.from("courses").insert({ code, name: "Gjennomgang" }).select("id").single();
    if (course.error || !course.data) throw new Error(`Fikk ikke laget emnet: ${course.error?.message}`);
    courseId = course.data.id;
    const chapter = await testUser
      .from("chapters")
      .insert({ course_id: courseId, number: 1, title: "Kapittel" })
      .select("id")
      .single();
    if (chapter.error || !chapter.data) throw new Error(`Fikk ikke laget kapittelet: ${chapter.error?.message}`);
    chapterId = chapter.data.id;
    data = new SupabaseDataSource(service, testUserId);
  });

  afterAll(async () => {
    // Kapittelet og spørsmålene slettes med emnet (on delete cascade).
    if (courseId) await testUser.from("courses").delete().eq("id", courseId);
    await testUser.auth.signOut();
  });

  async function rows(): Promise<Row[]> {
    const { data: found, error } = await service
      .from("review_questions")
      .select("id, position, text, status, retired_at, updated_at")
      .eq("chapter_id", chapterId)
      .order("created_at");
    if (error || !found) throw new Error(`Fikk ikke lest spørsmålene: ${error?.message}`);
    return found as Row[];
  }

  async function active() {
    const listed = await data.listReviewQuestions(chapterId);
    if (listed.status !== "ok") throw new Error("utilgjengelig");
    return listed.value.filter((q) => q.status === "aktiv");
  }

  it("synkroniserer gjennom hele livsløpet, og sletter aldri noe", async () => {
    // Første synkronisering.
    expect(await data.syncReviewQuestions(chapterId, ["En?", "To?", "Tre?"])).toEqual({
      status: "ok",
      value: { active: 3, added: 3, retired: 0 },
    });
    const first = await active();
    expect(first.map((q) => [q.position, q.text, q.chapterId])).toEqual([
      [1, "En?", chapterId],
      [2, "To?", chapterId],
      [3, "Tre?", chapterId],
    ]);
    const firstRows = await rows();

    // Samme liste på nytt: ingen nye rader, samme ID-er, og radene røres ikke.
    expect(await data.syncReviewQuestions(chapterId, ["En?", "To?", "Tre?"])).toEqual({
      status: "ok",
      value: { active: 3, added: 0, retired: 0 },
    });
    expect(await active()).toEqual(first);
    expect(await rows()).toEqual(firstRows);

    // Endret tekst: nytt spørsmål, det gamle trekkes tilbake med retired_at.
    expect(await data.syncReviewQuestions(chapterId, ["En?", "To?", "Tre, omformulert?"])).toEqual({
      status: "ok",
      value: { active: 3, added: 1, retired: 1 },
    });
    const three = firstRows[2];
    const afterChange = await rows();
    expect(afterChange).toHaveLength(4);
    expect(afterChange.find((r) => r.id === three.id)).toMatchObject({ status: "trukket", retired_at: expect.any(String) });
    const changed = await active();
    expect(changed[2].text).toBe("Tre, omformulert?");
    expect(changed[2].id).not.toBe(three.id);

    // Spørsmålet kommer tilbake og får den gamle ID-en. Bytte av rekkefølge gir ny plass.
    expect(await data.syncReviewQuestions(chapterId, ["Tre?", "En?", "To?"])).toEqual({
      status: "ok",
      value: { active: 3, added: 1, retired: 1 },
    });
    const reordered = await active();
    expect(reordered.map((q) => [q.id, q.position, q.text])).toEqual([
      [three.id, 1, "Tre?"],
      [first[0].id, 2, "En?"],
      [first[1].id, 3, "To?"],
    ]);
    const afterReturn = await rows();
    expect(afterReturn).toHaveLength(4);
    expect(afterReturn.find((r) => r.id === three.id)).toMatchObject({ status: "aktiv", retired_at: null });

    // Tom liste trekker tilbake alle, uten å slette.
    expect(await data.syncReviewQuestions(chapterId, [])).toEqual({
      status: "ok",
      value: { active: 0, added: 0, retired: 3 },
    });
    expect(await active()).toEqual([]);
    const afterEmpty = await rows();
    expect(afterEmpty).toHaveLength(4);
    expect(afterEmpty.every((r) => r.status === "trukket" && r.retired_at !== null)).toBe(true);
  });

  it("gir «unavailable» for et kapittel som ikke er eierens, og endrer ingenting", async () => {
    const before = await rows();
    const other = new SupabaseDataSource(service, "00000000-0000-0000-0000-000000000000");
    expect(await other.syncReviewQuestions(chapterId, ["Fremmed?"])).toEqual({ status: "unavailable" });
    expect(await rows()).toEqual(before);
  });
});
