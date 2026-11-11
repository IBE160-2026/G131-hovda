import { createServerClient, type CookieOptions } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

export type CookieToSet = { name: string; value: string; options: CookieOptions };

export type CookieAccess = {
  getAll(): { name: string; value: string }[];
  setAll(cookies: CookieToSet[]): void;
};

// Supabase-klient for serverkode. Cookiene kommer fra `next/headers` via komposisjonsroten.
// @supabase/ssr lagrer økta i varige cookies (400 dager), så den huskes på enheten.
export function createSupabaseServerClient(cookies: CookieAccess): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error(
      "Mangler NEXT_PUBLIC_SUPABASE_URL eller NEXT_PUBLIC_SUPABASE_ANON_KEY. Se .env.example.",
    );
  }
  return createServerClient(url, key, {
    cookies: {
      getAll: () => cookies.getAll(),
      setAll: (toSet) => cookies.setAll(toSet),
    },
  });
}
