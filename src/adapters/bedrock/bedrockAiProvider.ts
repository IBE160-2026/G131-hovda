// KI-modulen (AD-7): porten AiProvider mot Claude på Amazon Bedrock, via Mantle-endepunktet i
// eu-central-1. Svaret valideres mot et zod-skjema (strukturert utdata) før det gis videre.
import { AnthropicBedrockMantle } from "@anthropic-ai/bedrock-sdk";
import { APIConnectionError, APIError, AnthropicError } from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import type { AiProvider, SummaryInput, SummaryResult } from "@/application/aiProvider";
import { SUMMARY_PROMPT_VERSION, summarySchema, summarySystemPrompt, summaryUserMessage } from "./prompts/summary.v1";
import { aiSettings, mantleBaseUrl, settingsErrors } from "./settings";

/** Bare den delen av klienten som brukes, så testene kan gi en falsk klient. */
export type MessagesClient = Pick<AnthropicBedrockMantle, "messages">;

export type AwsKeys = { accessKeyId: string; secretAccessKey: string };

/**
 * Lager Mantle-klienten med nøklene som konstruktørvalg, ikke via process.env. Region og
 * endepunkt settes eksplisitt, så AWS_REGION eller ANTHROPIC_BEDROCK_MANTLE_BASE_URL ikke kan
 * flytte kallene ut av Frankfurt.
 */
export function createMantleClient(keys: AwsKeys): AnthropicBedrockMantle {
  const errors = settingsErrors(aiSettings);
  if (errors.length > 0) throw new Error(`Ugyldige KI-innstillinger: ${errors.join(" ")}`);
  return new AnthropicBedrockMantle({
    awsRegion: aiSettings.region,
    baseURL: mantleBaseUrl(aiSettings.region),
    awsAccessKey: keys.accessKeyId,
    awsSecretAccessKey: keys.secretAccessKey,
    // Ikke bruk AWS_BEARER_TOKEN_BEDROCK fra miljøet.
    apiKey: null,
  });
}

/** Kort norsk årsak som lagres på en feilet versjon. Tar aldri med nøkler eller forespørselen. */
export function failureReason(error: unknown): string {
  if (error instanceof APIConnectionError) return "Fikk ikke kontakt med Bedrock.";
  if (error instanceof APIError) {
    const status = error.status ?? "ukjent status";
    return `Bedrock svarte med feil (${status}): ${error.message}`.slice(0, 500);
  }
  if (error instanceof AnthropicError) return `Svaret kunne ikke leses: ${error.message}`.slice(0, 500);
  return "KI-kallet stoppet med en uventet feil.";
}

export class BedrockAiProvider implements AiProvider {
  readonly summaryPromptVersion = SUMMARY_PROMPT_VERSION;

  constructor(private readonly client: MessagesClient) {}

  async summarize(input: SummaryInput): Promise<SummaryResult> {
    const task = aiSettings.tasks.summary;
    const meta = { modelId: task.modelId, promptVersion: SUMMARY_PROMPT_VERSION };
    try {
      const response = await this.client.messages.parse({
        model: task.modelId,
        max_tokens: task.maxTokens,
        system: summarySystemPrompt,
        messages: [{ role: "user", content: summaryUserMessage(input) }],
        output_config: { effort: task.effort, format: zodOutputFormat(summarySchema) },
      });
      if (response.stop_reason === "refusal") return { status: "failed", reason: "KI-en avslo å lage sammendraget.", ...meta };
      if (response.stop_reason === "max_tokens") return { status: "failed", reason: "Svaret ble kuttet før det var ferdig.", ...meta };
      const parsed = summarySchema.safeParse(response.parsed_output);
      if (!parsed.success) return { status: "failed", reason: "Svaret fulgte ikke skjemaet.", ...meta };
      return { status: "ok", text: parsed.data.sammendrag, ...meta };
    } catch (error) {
      return { status: "failed", reason: failureReason(error), ...meta };
    }
  }
}
