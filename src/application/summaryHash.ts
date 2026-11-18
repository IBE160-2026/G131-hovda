// `inputHash` for sammendrag (AD-4). Bruker den globale `crypto.subtle`, som finnes både i Node og
// i nettleseren, så applikasjonslaget trenger ingen serverkode (AD-1).
import { summaryHashSource, type SummaryHashParts } from "@/domain/summary";

/** SHA-256 av hash-grunnlaget, som 64 heksadesimale tegn. */
export async function summaryInputHash(parts: SummaryHashParts): Promise<string> {
  const bytes = new TextEncoder().encode(summaryHashSource(parts));
  const digest = await globalThis.crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}
