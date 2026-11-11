import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";
import { getAuth } from "@/composition/server";
import { safeNextPath } from "./safeNextPath";

// Fornyer økta der cookies kan skrives, og sender tilbake til siden eieren kom fra.
// Feiler fornyingen, har Supabase alt fjernet økta, og eieren havner på forsiden.
export async function GET(request: NextRequest) {
  const next = safeNextPath(request.nextUrl.searchParams.get("neste"));
  const owner = await (await getAuth()).getOwner();
  redirect(owner ? next : "/");
}
