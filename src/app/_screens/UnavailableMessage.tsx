import { unavailableMessage } from "../(innlogget)/emner/formState";

/** Feilmeldingen når data ikke kan leses. */
export function UnavailableMessage() {
  return (
    <p role="alert" className="font-semibold text-error">
      {unavailableMessage}
    </p>
  );
}
