// Porten for innlogging. Brukstilfellene kjenner bare denne, ikke Supabase (AD-1, AD-9).

export type Owner = {
  id: string;
  email: string;
};

// `invalid` dekker både feil passord og ukjent e-post, så appen ikke røper hvilke kontoer som finnes.
export type SignInResult = "ok" | "invalid" | "unavailable";

export interface Auth {
  signIn(email: string, password: string): Promise<SignInResult>;
  signOut(): Promise<void>;
  getOwner(): Promise<Owner | null>;
}
