import { redirect } from "next/navigation";
import { getOwnerForRender } from "@/composition/server";
import { RefreshSession } from "./RefreshSession";

export async function OwnerGate({ children }: { children: React.ReactNode }) {
  const { owner, refreshPending } = await getOwnerForRender();

  // Supabase fornyet tokenet, men cookies kan ikke skrives her. Fornyingsruten lagrer det.
  if (refreshPending) return <RefreshSession />;
  if (!owner) redirect("/");

  return children;
}
