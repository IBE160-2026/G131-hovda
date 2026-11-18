// EU-regelen (AD-7, beslutning 18.11.2026): all KI-behandling i eu-central-1 via Mantle.
import { describe, expect, it } from "vitest";
import { aiSettings, mantleBaseUrl, settingsErrors } from "./settings";

describe("KI-innstillingene", () => {
  it("bruker eu-central-1 og bare modell-ID-er som starter med anthropic.", () => {
    expect(aiSettings.region).toBe("eu-central-1");
    for (const task of Object.values(aiSettings.tasks)) expect(task.modelId).toMatch(/^anthropic\./);
    expect(settingsErrors(aiSettings)).toEqual([]);
  });

  it("setter effort eksplisitt for hver oppgave", () => {
    for (const task of Object.values(aiSettings.tasks)) expect(["low", "medium", "high"]).toContain(task.effort);
    expect(aiSettings.tasks.summary).toEqual({
      modelId: "anthropic.claude-sonnet-5-5",
      effort: "medium",
      maxTokens: 16000,
    });
  });

  it("går mot det regionale endepunktet i Frankfurt, aldri det globale", () => {
    expect(mantleBaseUrl(aiSettings.region)).toBe("https://bedrock-mantle.eu-central-1.api.aws/anthropic");
  });

  it("avviser andre regioner og modell-ID-er uten anthropic.", () => {
    const task = { effort: "medium", maxTokens: 1 } as const;
    expect(settingsErrors({ region: "us-east-1", tasks: {} })).toEqual(["Regionen er us-east-1, ikke eu-central-1."]);
    for (const modelId of ["global.anthropic.claude-sonnet-5-5", "us.anthropic.claude-sonnet-5-5", "eu.anthropic.claude-sonnet-5-5", "claude-sonnet-5-5"]) {
      expect(settingsErrors({ region: "eu-central-1", tasks: { summary: { ...task, modelId } } })).toHaveLength(1);
    }
  });
});
