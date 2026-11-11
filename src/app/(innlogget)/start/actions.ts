"use server";

import { redirect } from "next/navigation";
import { getAuth } from "@/composition/server";

export async function logOut() {
  await (await getAuth()).signOut();
  redirect("/");
}
