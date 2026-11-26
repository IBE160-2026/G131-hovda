// Komposisjonsroten for Next.js-serveren. Her kobles portene til adapterne (AD-1).
import { cookies } from "next/headers";
import { connection } from "next/server";
import { cache } from "react";
import type { Auth, Owner } from "@/application/auth";
import type { Clock } from "@/application/clock";
import type { DataSource } from "@/application/dataSource";
import { OsloClock } from "@/adapters/clock/osloClock";
import { SupabaseAuth } from "@/adapters/supabase/auth";
import { SupabaseDataSource } from "@/adapters/supabase/dataSource";
import { createSupabaseServerClient } from "@/adapters/supabase/serverClient";

// Klient med skrivbare cookies, for Server Actions og Route Handlers.
async function createWritableClient() {
  const cookieStore = await cookies();
  return createSupabaseServerClient({
    getAll: () => cookieStore.getAll(),
    setAll: (toSet) => {
      for (const { name, value, options } of toSet) {
        cookieStore.set(name, value, options);
      }
    },
  });
}

// For Server Actions og Route Handlers, der cookies kan skrives.
export async function getAuth(): Promise<Auth> {
  return new SupabaseAuth((await createWritableClient()).auth);
}

// For Server Components, der cookies ikke kan skrives. Fornyer Supabase tokenet under
// visningen, går det nye tokenet tapt. `refreshPending` sier da fra, så siden kan sende
// eieren innom fornyingsruten (/auth/forny), som fornyer på nytt med skrivbare cookies.
// `cache` gjør at layout og side deler ett oppslag per forespørsel.
// `connection()` utsetter oppslaget til forespørselen. Ellers kjører det i prefetchen av App Shell
// (Partial Prefetching), der Supabase leser `Date.now()` for å sjekke tokenet, og Next feiler.
export const getOwnerForRender = cache(
  async (): Promise<{ owner: Owner | null; refreshPending: boolean }> => {
    await connection();
    const cookieStore = await cookies();
    let refreshPending = false;
    const client = createSupabaseServerClient({
      getAll: () => cookieStore.getAll(),
      setAll: () => {
        refreshPending = true;
      },
    });
    const owner = await new SupabaseAuth(client.auth).getOwner();
    return { owner, refreshPending };
  },
);

// For Server Actions. Verifiserer eieren selv og gir `null` uten innlogget eier.
// Databasekallene går med eierens økt, så RLS virker (AD-10).
export async function getDataSource(): Promise<DataSource | null> {
  const client = await createWritableClient();
  const owner = await new SupabaseAuth(client.auth).getOwner();
  if (!owner) return null;
  return new SupabaseDataSource(client, owner.id);
}

// For Server Components. Bruker eieren fra `getOwnerForRender` og gir `null` uten eier.
export const getDataSourceForRender = cache(async (): Promise<DataSource | null> => {
  const { owner } = await getOwnerForRender();
  if (!owner) return null;
  const cookieStore = await cookies();
  // Cookies kan ikke skrives her. Fornying under visningen fanges av `getOwnerForRender`.
  const client = createSupabaseServerClient({
    getAll: () => cookieStore.getAll(),
    setAll: () => {},
  });
  return new SupabaseDataSource(client, owner.id);
});

// Klokka for appen: dagens dato i Europe/Oslo (AD-11).
export function getClock(): Clock {
  return new OsloClock();
}
