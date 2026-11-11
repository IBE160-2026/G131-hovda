import { describe, expect, it } from "vitest";
import { AuthApiError, AuthRetryableFetchError, type AuthError } from "@supabase/supabase-js";
import { SupabaseAuth, toSignInResult, type SupabaseAuthClient } from "./auth";

function fakeClient(overrides: Partial<SupabaseAuthClient>): SupabaseAuthClient {
  return {
    signInWithPassword: async () => {
      throw new Error("ikke satt opp");
    },
    signOut: async () => ({ error: null }),
    getUser: async () => {
      throw new Error("ikke satt opp");
    },
    ...overrides,
  } as SupabaseAuthClient;
}

function signInFails(error: AuthError) {
  return fakeClient({
    signInWithPassword: (async () => ({
      data: { user: null, session: null },
      error,
    })) as SupabaseAuthClient["signInWithPassword"],
  });
}

describe("SupabaseAuth.signIn", () => {
  it("gir ok når Supabase godtar innloggingen", async () => {
    const auth = new SupabaseAuth(
      fakeClient({
        signInWithPassword: (async () => ({
          data: { user: {}, session: {} },
          error: null,
        })) as unknown as SupabaseAuthClient["signInWithPassword"],
      }),
    );
    expect(await auth.signIn("eier@example.no", "riktig")).toBe("ok");
  });

  it("gir invalid ved feil passord", async () => {
    const error = new AuthApiError("Invalid login credentials", 400, "invalid_credentials");
    const auth = new SupabaseAuth(signInFails(error));
    expect(await auth.signIn("eier@example.no", "feil")).toBe("invalid");
  });

  it("gir samme svar, invalid, for ukjent e-post", async () => {
    const error = new AuthApiError("Invalid login credentials", 400, "invalid_credentials");
    const auth = new SupabaseAuth(signInFails(error));
    expect(await auth.signIn("ukjent@example.no", "hva-som-helst")).toBe("invalid");
  });

  it("gir unavailable ved nettverksfeil", async () => {
    const error = new AuthRetryableFetchError("Failed to fetch", 0);
    const auth = new SupabaseAuth(signInFails(error));
    expect(await auth.signIn("eier@example.no", "riktig")).toBe("unavailable");
  });

  it("gir unavailable når Supabase svarer med serverfeil", async () => {
    const error = new AuthApiError("Internal error", 500, "unexpected_failure");
    const auth = new SupabaseAuth(signInFails(error));
    expect(await auth.signIn("eier@example.no", "riktig")).toBe("unavailable");
  });

  it("gir unavailable når klienten kaster", async () => {
    const auth = new SupabaseAuth(
      fakeClient({
        signInWithPassword: async () => {
          throw new TypeError("fetch failed");
        },
      }),
    );
    expect(await auth.signIn("eier@example.no", "riktig")).toBe("unavailable");
  });
});

describe("toSignInResult", () => {
  it("gir invalid for 400 uten feilkode", () => {
    expect(toSignInResult({ status: 400 })).toBe("invalid");
  });

  it("gir unavailable for andre 400-feil med kode", () => {
    expect(toSignInResult({ status: 400, code: "validation_failed" })).toBe("unavailable");
  });

  it("gir unavailable ved for mange forsøk", () => {
    expect(toSignInResult({ status: 429, code: "over_request_rate_limit" })).toBe(
      "unavailable",
    );
  });
});

describe("SupabaseAuth.getOwner", () => {
  it("gir eieren når Supabase har verifisert brukeren", async () => {
    const auth = new SupabaseAuth(
      fakeClient({
        getUser: (async () => ({
          data: { user: { id: "u1", email: "eier@example.no" } },
          error: null,
        })) as unknown as SupabaseAuthClient["getUser"],
      }),
    );
    expect(await auth.getOwner()).toEqual({ id: "u1", email: "eier@example.no" });
  });

  it("gir null uten økt", async () => {
    const auth = new SupabaseAuth(
      fakeClient({
        getUser: (async () => ({
          data: { user: null },
          error: new AuthApiError("Auth session missing!", 400, undefined),
        })) as unknown as SupabaseAuthClient["getUser"],
      }),
    );
    expect(await auth.getOwner()).toBeNull();
  });

  it("gir null når Supabase ikke svarer", async () => {
    const auth = new SupabaseAuth(
      fakeClient({
        getUser: async () => {
          throw new TypeError("fetch failed");
        },
      }),
    );
    expect(await auth.getOwner()).toBeNull();
  });
});
