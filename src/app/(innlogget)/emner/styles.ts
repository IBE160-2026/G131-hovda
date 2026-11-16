// Felles klasser for knapper og lenker på emnesidene.
const focus =
  "focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-accent";

export const primaryButton = `inline-flex min-h-11 items-center justify-center rounded-full bg-accent px-6 py-3 text-base font-semibold text-accent-contrast transition-colors hover:bg-accent-hover disabled:opacity-70 ${focus}`;

export const secondaryButton = `inline-flex min-h-11 items-center justify-center rounded-full border border-accent px-5 py-2 text-base font-semibold text-accent transition-colors hover:bg-card ${focus}`;

export const dangerButton = `inline-flex min-h-11 items-center justify-center rounded-full bg-error px-6 py-3 text-base font-semibold text-background transition-opacity hover:opacity-90 disabled:opacity-70 ${focus}`;

export const textLink = `font-semibold text-accent underline underline-offset-4 hover:no-underline ${focus}`;

export const pageMain = "mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-4 py-12 sm:px-8 sm:py-20";
