import { Suspense } from "react";
import { getOwnerForRender } from "@/composition/server";

// Viser innholdet bare for en verifisert eier, så det aldri ligger i den statiske delen av siden.
export function OwnerOnly({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={null}>
      <OwnerCheck>{children}</OwnerCheck>
    </Suspense>
  );
}

export async function OwnerCheck({ children }: { children: React.ReactNode }) {
  const { owner } = await getOwnerForRender();
  return owner ? children : null;
}
