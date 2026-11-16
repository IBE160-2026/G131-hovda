// Sjekker RLS og GRANT for courses, user_settings, chapters og subchapters mot Supabase-prosjektet dev (AD-10).
// Kjøres bare med `npm run test:dev`. Krever en testkonto i dev som ikke er eieren:
// RLS_TEST_EMAIL og RLS_TEST_PASSWORD i .env.local, i tillegg til Supabase-nøklene.
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

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

  it("gir uinnloggede ingen tilgang til tabellene", async () => {
    const anon = newClient();
    const courses = await anon.from("courses").select("id");
    const settings = await anon.from("user_settings").select("owner_id");
    expect(courses.error?.code).toBe("42501");
    expect(settings.error?.code).toBe("42501");
    for (const table of ["chapters", "subchapters"]) {
      const { error } = await anon.from(table).select("id");
      expect(error?.code).toBe("42501");
    }
  });
});
