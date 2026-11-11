import { Suspense } from "react";
import { OwnerGate } from "./OwnerGate";

// Tilgangslåsen: alt i denne gruppen krever at eieren er logget inn (FR-25, AD-9).
// Sidene rendres for seg (Partial Prerendering), så hver side må også vise innholdet sitt
// bak `OwnerOnly`. Ellers havner det i den statiske delen som alle får.
export default function LoggedInLayout({ children }: LayoutProps<"/">) {
  return (
    <Suspense fallback={<p className="px-4 py-12 text-center text-muted">Laster …</p>}>
      <OwnerGate>{children}</OwnerGate>
    </Suspense>
  );
}
