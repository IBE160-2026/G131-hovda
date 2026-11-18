// Innstillingsfilen for KI-modulen (AD-7): modell og effort for hver oppgave står her og ingen
// andre steder, og effort settes alltid eksplisitt.
//
// Beslutning 18.11.2026: Klienten er `AnthropicBedrockMantle` mot det regionale endepunktet i
// eu-central-1 (Frankfurt), så all behandling skjer i EU. Det globale endepunktet brukes aldri.
// Modell-ID-ene på Mantle starter med `anthropic.` (ikke `eu.`-profiler som i AD-7 opprinnelig).

export type Effort = "low" | "medium" | "high";

export type TaskSettings = {
  modelId: string;
  effort: Effort;
  maxTokens: number;
};

export type AiSettings = {
  region: string;
  tasks: Record<string, TaskSettings>;
};

/** Den eneste tillatte regionen. */
export const EU_REGION = "eu-central-1";

export const aiSettings = {
  region: EU_REGION,
  tasks: {
    // Høyst 600 ord. Taket gir rom for tenkingen, som også teller.
    summary: { modelId: "anthropic.claude-sonnet-5-5", effort: "medium", maxTokens: 16000 },
  },
} as const satisfies AiSettings;

/** Det regionale Mantle-endepunktet. Settes eksplisitt, så miljøvariabler ikke kan styre det. */
export function mantleBaseUrl(region: string): string {
  return `https://bedrock-mantle.${region}.api.aws/anthropic`;
}

/**
 * Feil i innstillingene: regionen må være eu-central-1, og hver modell-ID må starte med
 * `anthropic.`, så verken globale (`global.`) eller andre regionale profiler (`us.`) slipper gjennom.
 */
export function settingsErrors(settings: AiSettings): string[] {
  const errors: string[] = [];
  if (settings.region !== EU_REGION) errors.push(`Regionen er ${settings.region}, ikke ${EU_REGION}.`);
  for (const [task, { modelId }] of Object.entries(settings.tasks)) {
    if (!modelId.startsWith("anthropic.")) errors.push(`Modell-ID-en for ${task} (${modelId}) starter ikke med anthropic.`);
  }
  return errors;
}
