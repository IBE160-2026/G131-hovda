import { redirect } from "next/navigation";
import { getOwnerForRender } from "@/composition/server";

// Sender en innlogget eier rett til startsiden. Leser cookies, så den må ligge i <Suspense>.
export async function RedirectIfOwner() {
  const { owner } = await getOwnerForRender();
  if (owner) redirect("/start");
  return null;
}
