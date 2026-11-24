import { demoLoadingMessage } from "./messages";

/** Vises mens demoen leser fila i nettleseren. */
export function Loading() {
  return (
    <p role="status" className="text-muted">
      {demoLoadingMessage}
    </p>
  );
}
