// Komposisjonsroten for Next.js-serveren. Her kobles portene til adapterne (AD-1).
import { cookies } from "next/headers";
import { cache } from "react";
import type { Auth, Owner } from "@/application/auth";
import { SupabaseAuth } from "@/adapters/supabase/auth";
import { createSupabaseServerClient } from "@/adapters/supabase/serverClient";

// For Server Actions og Route Handlers, der cookies kan skrives.
export async function getAuth(): Promise<Auth> {
  const cookieStore = await cookies();
  const client = createSupabaseServerClient({
    getAll: () => cookieStore.getAll(),
    setAll: (toSet) => {
      for (const { name, value, options } of toSet) {
        cookieStore.set(name, value, options);
      }
    },
  });
  return new SupabaseAuth(client.auth);
}

// For Server Components, der cookies ikke kan skrives. Fornyer Supabase tokenet under
// visningen, går det nye tokenet tapt. `refreshPending` sier da fra, så siden kan sende
// eieren innom fornyingsruten (/auth/forny), som fornyer på nytt med skrivbare cookies.
// `cache` gjør at layout og side deler ett oppslag per forespørsel.
export const getOwnerForRender = cache(
  async (): Promise<{ owner: Owner | null; refreshPending: boolean }> => {
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
