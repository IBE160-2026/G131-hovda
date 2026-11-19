// Komposisjonsroten for lokale kommandoer i scripts/ (AD-1). Scripts importerer aldri adaptere
// direkte, bare denne filen.
//
// Scriptene har ingen innlogget økt, så klienten bruker service role-nøkkelen og omgår RLS.
// Adapteren filtrerer likevel alltid på eier, og eieren finnes bare via OWNER_EMAIL.
//
// Env-fila leses uten å lastes inn i process.env, så nøklene gis direkte til klientene.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parseEnv } from "node:util";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { DataSource } from "@/application/dataSource";
import { SupabaseDataSource } from "@/adapters/supabase/dataSource";

export type ScriptTarget = "dev" | "prod";

export type ScriptDataSource = { ok: true; data: DataSource } | { ok: false; error: string };

const REQUIRED = ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "OWNER_EMAIL"] as const;

/** Filen med nøkler for miljøet: `.env.dev.local` eller `.env.prod.local` i prosjektroten. */
export function envFileFor(target: ScriptTarget): string {
  return `.env.${target}.local`;
}

type EnvResult<N extends string> = { ok: true; env: Record<N, string> } | { ok: false; error: string };

function readEnv<N extends string>(
  target: ScriptTarget,
  root: string,
  required: readonly N[],
): EnvResult<N> {
  const file = envFileFor(target);
  let content: string;
  try {
    content = readFileSync(resolve(root, file), "utf8");
  } catch {
    return { ok: false, error: `Fant ikke ${file}. Se README og .env.example.` };
  }
  const parsed = parseEnv(content);
  const missing = required.filter((name) => !parsed[name]?.trim());
  if (missing.length > 0) return { ok: false, error: `Mangler ${missing.join(", ")} i ${file}.` };
  return { ok: true, env: Object.fromEntries(required.map((name) => [name, parsed[name]!.trim()])) as Record<N, string> };
}

async function findUserId(client: SupabaseClient, email: string): Promise<{ id: string | null } | { error: string }> {
  const wanted = email.toLowerCase();
  const perPage = 200;
  for (let page = 1; ; page++) {
    const { data, error } = await client.auth.admin.listUsers({ page, perPage });
    if (error) return { error: error.message };
    const user = data.users.find((u) => u.email?.toLowerCase() === wanted);
    if (user) return { id: user.id };
    if (data.users.length < perPage) return { id: null };
  }
}

/** Lager en DataSource for eieren i `target`. Leser nøklene fra `.env.<target>.local`. */
export async function getDataSourceForScript(
  target: ScriptTarget,
  root: string = process.cwd(),
): Promise<ScriptDataSource> {
  const env = readEnv(target, root, REQUIRED);
  if (!env.ok) return env;

  const client = createClient(env.env.NEXT_PUBLIC_SUPABASE_URL, env.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  let owner: Awaited<ReturnType<typeof findUserId>>;
  try {
    owner = await findUserId(client, env.env.OWNER_EMAIL);
  } catch (error) {
    owner = { error: error instanceof Error ? error.message : String(error) };
  }
  if ("error" in owner) return { ok: false, error: `Fikk ikke slått opp eieren i ${target}: ${owner.error}` };
  if (!owner.id) return { ok: false, error: `Fant ingen bruker med OWNER_EMAIL fra ${envFileFor(target)} i ${target}.` };

  return { ok: true, data: new SupabaseDataSource(client, owner.id) };
}
