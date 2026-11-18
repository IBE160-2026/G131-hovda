// Tester KI-modulen med en falsk klient. Ingen ekte KI-kall i automatiske tester.
import { APIConnectionError, APIError } from "@anthropic-ai/sdk";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { SummaryInput } from "@/application/aiProvider";
import { BedrockAiProvider, createMantleClient, failureReason, type MessagesClient } from "./bedrockAiProvider";
import { summaryUserMessage } from "./prompts/summary.v1";

const input: SummaryInput = {
  courseCode: "IBE430",
  courseName: "Virksomhetssystemer",
  learningOutcomes: "Studenten kan ERP.",
  chapterNumber: 1,
  chapterTitle: "Innledning",
  learningGoals: "- mål",
  keyConcepts: "",
  subchapterNumber: "1.2",
  subchapterTitle: "To",
  noteText: "Notatet.",
};

function fakeClient(parse: (...args: unknown[]) => unknown) {
  const spy = vi.fn(async (...args: unknown[]) => parse(...args));
  return { client: { messages: { parse: spy } } as unknown as MessagesClient, spy };
}

const meta = { modelId: "anthropic.claude-sonnet-5-5", promptVersion: "summary.v1" };

describe("BedrockAiProvider", () => {
  it("ber om strukturert utdata med modell og effort fra innstillingene", async () => {
    const { client, spy } = fakeClient(() => ({ stop_reason: "end_turn", parsed_output: { sammendrag: "Kort." } }));
    const result = await new BedrockAiProvider(client).summarize(input);
    expect(result).toEqual({ status: "ok", text: "Kort.", ...meta });
    const params = spy.mock.calls[0][0] as Record<string, unknown> & { output_config: Record<string, unknown> };
    expect(params).toMatchObject({
      model: "anthropic.claude-sonnet-5-5",
      max_tokens: 16000,
      messages: [{ role: "user", content: summaryUserMessage(input) }],
    });
    expect(params.output_config.effort).toBe("medium");
    expect(params.output_config.format).toMatchObject({ type: "json_schema" });
  });

  it("gir failed når svaret ikke følger skjemaet", async () => {
    const { client } = fakeClient(() => ({ stop_reason: "end_turn", parsed_output: null }));
    expect(await new BedrockAiProvider(client).summarize(input)).toEqual({
      status: "failed",
      reason: "Svaret fulgte ikke skjemaet.",
      ...meta,
    });
  });

  it("gir failed ved avslag og kuttet svar", async () => {
    const refusal = fakeClient(() => ({ stop_reason: "refusal", parsed_output: null }));
    expect(await new BedrockAiProvider(refusal.client).summarize(input)).toMatchObject({
      status: "failed",
      reason: "KI-en avslo å lage sammendraget.",
    });
    const cut = fakeClient(() => ({ stop_reason: "max_tokens", parsed_output: null }));
    expect(await new BedrockAiProvider(cut.client).summarize(input)).toMatchObject({
      status: "failed",
      reason: "Svaret ble kuttet før det var ferdig.",
    });
  });

  it("gjør feil fra klienten om til failed med kort årsak", async () => {
    const { client } = fakeClient(() => {
      throw new APIConnectionError({ message: "fetch failed" });
    });
    expect(await new BedrockAiProvider(client).summarize(input)).toEqual({
      status: "failed",
      reason: "Fikk ikke kontakt med Bedrock.",
      ...meta,
    });
  });
});

describe("failureReason", () => {
  it("tar med status for API-feil og er kort for ukjente feil", () => {
    const error = APIError.generate(403, { message: "no access" }, "no access", new Headers());
    expect(failureReason(error)).toMatch(/^Bedrock svarte med feil \(403\)/);
    expect(failureReason(new Error("x"))).toBe("KI-kallet stoppet med en uventet feil.");
  });
});

describe("createMantleClient", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("går mot det regionale endepunktet i eu-central-1 med nøklene fra konstruktøren, uansett miljøvariabler", () => {
    vi.stubEnv("ANTHROPIC_BEDROCK_MANTLE_BASE_URL", "https://example.invalid");
    vi.stubEnv("AWS_REGION", "us-east-1");
    const client = createMantleClient({ accessKeyId: "AKIATEST", secretAccessKey: "hemmelig" });
    expect(client.baseURL).toBe("https://bedrock-mantle.eu-central-1.api.aws/anthropic");
    expect(client.awsRegion).toBe("eu-central-1");
    expect(client.awsAccessKey).toBe("AKIATEST");
  });
});

describe("prompten", () => {
  it("sender notatet som eneste kilde og konteksten med", () => {
    const message = summaryUserMessage(input);
    expect(message).toContain("<notat>\nNotatet.\n</notat>");
    expect(message).toContain("Studenten kan ERP.");
    expect(message).toContain("Kapittelets nøkkelbegreper:\n(ingen)");
  });
});
