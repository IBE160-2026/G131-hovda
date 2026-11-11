"use server";

import { redirect } from "next/navigation";
import { getAuth } from "@/composition/server";

export type LoginState = {
  email: string;
  error: string | null;
};

const messages = {
  invalid: "Feil e-post eller passord.",
  unavailable: "Innloggingen virker ikke akkurat nå. Prøv igjen senere.",
};

export async function logIn(_previous: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  const result = await (await getAuth()).signIn(email, password);
  if (result === "ok") redirect("/start");

  return { email, error: messages[result] };
}
