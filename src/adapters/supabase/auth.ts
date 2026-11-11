import type { SupabaseClient } from "@supabase/supabase-js";
import type { Auth, Owner, SignInResult } from "@/application/auth";

// Bare den delen av Supabase-klienten som adapteren bruker, så testene kan bruke en falsk klient.
export type SupabaseAuthClient = Pick<
  SupabaseClient["auth"],
  "signInWithPassword" | "signOut" | "getUser"
>;

type AuthErrorLike = { status?: number; code?: string };

// Feil passord og ukjent e-post gir begge `invalid_credentials` med status 400.
// Alt annet (nettverk, 5xx, for mange forsøk) betyr at innloggingen ikke virker akkurat nå.
export function toSignInResult(error: AuthErrorLike | null): SignInResult {
  if (!error) return "ok";
  if (error.code === "invalid_credentials") return "invalid";
  if (error.status === 400 && !error.code) return "invalid";
  return "unavailable";
}

export class SupabaseAuth implements Auth {
  constructor(private readonly auth: SupabaseAuthClient) {}

  async signIn(email: string, password: string): Promise<SignInResult> {
    try {
      const { error } = await this.auth.signInWithPassword({ email, password });
      return toSignInResult(error);
    } catch {
      return "unavailable";
    }
  }

  async signOut(): Promise<void> {
    // Logger bare ut denne enheten.
    await this.auth.signOut({ scope: "local" });
  }

  async getOwner(): Promise<Owner | null> {
    // `getUser` sjekker tokenet mot Supabase i stedet for å stole på cookien.
    try {
      const { data, error } = await this.auth.getUser();
      if (error || !data.user) return null;
      return { id: data.user.id, email: data.user.email ?? "" };
    } catch {
      return null;
    }
  }
}
