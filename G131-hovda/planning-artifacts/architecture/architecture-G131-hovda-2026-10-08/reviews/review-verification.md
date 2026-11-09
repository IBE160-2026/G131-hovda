# Review: verification lens, ARCHITECTURE-SPINE.md (Studievenn)

- **Reviewed:** `ARCHITECTURE-SPINE.md` (updated 2026-10-25) and `.memlog.md`
- **Review date:** 2026-10-25
- **Lens:** Does each committed decision rest on a web or reality check, not on training data? Are versions current, do the named technologies exist and fit, and what are the live defaults?
- **Method:** The memlog shows one research pass on 08.10.2026. The AI provider, model and client decisions were locked on 25.10.2026, after that pass. All of them were re-checked today against official sources where possible: AWS Bedrock model cards, nextjs.org/blog, supabase.com/pricing, the Supabase changelog, Vercel docs and the anthropic-sdk-typescript repo.

## Verdict

**Revise before the first AI code.** The stack mostly exists and fits. However, the AI-access decisions (AD-7, AD-12, Stack table) were locked after the 08.10 research and were never checked against Bedrock's live model cards. They are wrong as written:

- The chosen client (`AnthropicBedrockMantle`) cannot reach these models in any EU region.
- The model IDs given are not Bedrock invocation IDs.
- The Next.js version is one minor release behind, and may be behind a security patch.

## Findings

### F1 [CRITICAL]: `AnthropicBedrockMantle` / the bedrock-mantle endpoint is not available in any EU region for the chosen models

- **Location:** Stack table, row "Bedrock-klient (`@anthropic-ai/bedrock-sdk`, `AnthropicBedrockMantle`)". Memlog line 34.
- **Evidence:**
  - The AWS model cards (2026-10-25) list where the `bedrock-mantle` endpoint is available:
    - Opus 5.5: us-east-1, ap-southeast-4 and us-gov-west-1 only.
    - Sonnet 5.5 and Haiku 5.5: us-gov-west-1 only.
  - No EU region is listed for any of the three models.
  - Mantle also has no Geo or Global inference profiles ("N/A").
  - AWS's own tip on every card: "Whenever possible, we recommend using the `bedrock-runtime` endpoint for new applications."
  - The TypeScript package does export `AnthropicBedrockMantle` (`packages/bedrock-sdk/src/index.ts` on main), so the class exists. The README documents only `AnthropicBedrock`.
- **Impact:** Using this client would force the calls out of the EU (us-east-1) or make them fail. Either way AD-12 and NFR-4 are broken.
- **Fix:**
  - Change the client to `AnthropicBedrock` from `@anthropic-ai/bedrock-sdk`, which goes through the `bedrock-runtime` endpoint.
  - Set `awsRegion: 'eu-central-1'`.
  - Record the decision and the source in the memlog.

### F2 [HIGH]: The model IDs in the Stack table are not valid Bedrock IDs, and the EU Geo profile must be fixed explicitly

- **Location:** Stack table (`claude-opus-5-5`, `claude-sonnet-5-5`, `claude-haiku-5-5`), AD-7 and AD-12.
- **Evidence (AWS model cards):**
  - None of the three models supports In-Region in eu-central-1. Bare-ID In-Region use exists only for Opus 5.5, and only in eu-west-2 (London).
  - From Frankfurt, the only EU-residency option is the Geo EU profile:
    - `eu.anthropic.claude-opus-5-5`
    - `eu.anthropic.claude-sonnet-5-5`
    - `eu.anthropic.claude-haiku-5-5`
  - All three EU profiles exist (confirmed).
  - The sample code on the AWS cards and in the SDK README uses `global.anthropic.claude-*`. Global routing sends requests anywhere in the world.
- **Impact:**
  - `claude-opus-5-5` is the first-party API ID and is rejected by Bedrock.
  - If Claude Code copies the official example, it gets `global.*` and silently breaks the EU requirement.
- **Fix:**
  - In the Stack table and in the AI module's settings file, use the `eu.anthropic.claude-…-5-5` IDs.
  - Add a rule to AD-12 that the model ID must start with `eu.` and that `global.`/`us.` are forbidden. This can be checked in a test.

### F3 [MEDIUM]: AD-12 says "eu-central-1", but the Geo EU profile processes data in several EU regions

- **Location:** AD-12, the Stack row "EU-region (eu-central-1)" and the deployment diagram ("EU (Frankfurt)").
- **Evidence:** With eu-central-1 as the source, `eu.anthropic.claude-*-5-5` routes to six regions: Frankfurt, Stockholm, Milan, Spain, Ireland and Paris. All are EU/EEA, so NFR-4 still holds.
- **Fix:** Reword AD-12 to: "Claude via the Bedrock EU Geo inference profile, with eu-central-1 as the source region. Processing can take place in EU regions (Frankfurt, Stockholm, Milan, Spain, Ireland, Paris)." Update the diagram label accordingly. That keeps the IBE160 documentation honest.

### F4 [MEDIUM]: Next.js 16.3 is no longer the current version, and may lack the October security patch

- **Location:** Stack table, "Next.js … 16.3". Memlog line 11 (research from 08.10).
- **Evidence:**
  - On nextjs.org/blog, Next.js 16.4 shipped on 2026-10-06, and an out-of-band security update followed on 2026-10-14 (two Critical, one High in upstream dependencies).
  - A third-party release note (Pantheon) gives the patched versions as 16.4.1 and 15.5.28.
  - The last 16.3 patch I could see was 16.3.6 (22 Sept).
  - I could not confirm whether a 16.3.x patch exists for the October update.
- **Fix:**
  - Change the Stack row to "16.4 (locked at install, at least 16.4.1)".
  - Start from the current `create-next-app` and record the exact version in the memlog. It also generates AGENTS.md as of 16.2.

### F5 [MEDIUM]: Vercel defaults to `iad1`, and Routing Middleware runs in all regions

- **Location:** AD-12, Stack row "Vercel … `fra1` | Hobby".
- **Evidence (Vercel docs, "Configuring regions", updated 2026-08-11):**
  - "By default, Vercel Functions execute in Washington, D.C., USA (`iad1`) for all new projects." Hobby allows a "Single region", so `fra1` is possible but must be set explicitly.
  - "Vercel deploys Routing Middleware to all regions by default, regardless of your region settings."
- **Impact:** The usual Supabase pattern of refreshing the session in `middleware.ts`/`proxy.ts` would process auth cookies outside the EU.
- **Fix:**
  - Require `"regions": ["fra1"]` in `vercel.json`, and check it in the deployment summary.
  - Add a rule to AD-12: no middleware that reads user data or Supabase sessions. Do session refresh in server code (which runs in fra1), or accept the risk and document it.

### F6 [MEDIUM]: Supabase Data API change on 30.10.2026 requires an explicit GRANT on new tables

- **Location:** AD-10 (RLS), Deferred "Databaseskjema og migreringsverktøy".
- **Evidence:**
  - Supabase changelog #45329: tables in `public` are no longer exposed to the Data API/GraphQL automatically.
  - This has been the default for new projects since 30.05.2026. It applies to existing projects from 30.10.2026.
  - A missing grant gives error 42501.
- **Impact:** The dev and prod projects are new and the app has no tables yet, so every table will be affected. `supabase-js` uses the Data API.
- **Fix:** Add to AD-10 or the conventions: "Every migration that creates a table also creates explicit `GRANT`s (for `authenticated` only, not `anon`) together with RLS policies."

### F7 [LOW]: Bedrock price, no-training terms and effort defaults have not been checked against the source

- **Location:** AD-7 ("lav eller middels effort"), memlog lines 35–37 (cost estimate at first-party list prices).
- **Evidence:**
  - The Bedrock data protection page confirms that model providers "don't have access to Amazon Bedrock logs or to customer prompts and completions". That partly covers NFR-4.
  - I found no explicit "not used for training" wording on that page. It is only in the AWS FAQ, which I saw secondhand.
  - The model cards say Claude is billed through AWS Marketplace. I found no AWS source for the EU Geo price; third parties mention a regional surcharge.
  - Default effort is high for Sonnet 5.5 and medium for Opus 5.5 and Haiku 5.5. Opus 5.5 has adaptive thinking always on.
- **Fix:**
  - Before the first AI code, read the price on aws.amazon.com/bedrock/pricing for the EU Geo profile and quote the data-use FAQ in the memlog.
  - In AD-7, state that `effort` is always set explicitly per task, because Sonnet would otherwise run at high.

## Verification status per item

| Item | Spine says | Source today | Status |
| --- | --- | --- | --- |
| Next.js version | 16.3 | 16.4 (06.10), security update 14.10 (nextjs.org/blog) | **Out of date** (F4) |
| Supabase Free | 500 MB, pauses after 7 days | 500 MB/project, max 2 active projects, "paused after 1 week of inactivity", 50k MAU, 5 GB egress; Pro from 25 USD (supabase.com/pricing) | **Confirmed**. Two projects (dev+prod) uses the whole free limit |
| Supabase eu-central-1 | Frankfurt | Not checked against a live region list today; long-established Supabase region | **Not checked today** (low risk) |
| Supabase Data API grants | Not mentioned | Breaking change 30.10.2026 (changelog) | **New** (F6) |
| Vercel Hobby, fra1 | fra1, Hobby | Hobby = one region, default iad1; fra1 must be set; middleware runs in all regions | **Partly confirmed** (F5) |
| Vercel Hobby cron | Not used (Supabase pg_cron) | 2 cron jobs, once a day, imprecise timing (Vercel docs) | **Confirmed** that the choice of Supabase is sound |
| Claude Opus 5.5 on Bedrock EU | eu-central-1 | Launched 22.09.2026; `eu.anthropic.claude-opus-5-5` Geo from eu-central-1; In-Region only in eu-west-2 | **Exists**; ID and routing are wrong in the spine (F2, F3) |
| Claude Sonnet 5.5 on Bedrock EU | eu-central-1 | Launched 28.09.2026; `eu.anthropic.claude-sonnet-5-5` Geo; no In-Region in the EU | **Exists**; ID wrong (F2) |
| Claude Haiku 5.5 on Bedrock EU | eu-central-1 | Launched 07.10.2026; `eu.anthropic.claude-haiku-5-5` Geo; no In-Region in the EU | **Exists**; ID wrong (F2) |
| `AnthropicBedrockMantle` | Chosen client | Exported in the TS SDK source; Mantle endpoint not in any EU region for these models | **Unsuitable** (F1) |
| Bedrock no-training | Assumed (NFR-4) | Providers have no access to prompts or completions (AWS data protection); no-training only confirmed secondhand | **Partly confirmed** (F7) |
| Bedrock EU price | ~5 USD/month estimated from first-party prices | Not found in an AWS source | **Not confirmed** (F7) |
| `@supabase/supabase-js`, `@anthropic-ai/bedrock-sdk` versions | "locked at install" | No npm versions checked | **Acceptable** as long as the lockfile version is recorded in the memlog |

## Sources

- AWS Bedrock model cards: [Opus 5.5](https://docs.aws.amazon.com/bedrock/latest/userguide/model-card-anthropic-claude-opus-5-5.html), [Sonnet 5.5](https://docs.aws.amazon.com/bedrock/latest/userguide/model-card-anthropic-claude-sonnet-5-5.html), [Haiku 5.5](https://docs.aws.amazon.com/bedrock/latest/userguide/model-card-anthropic-claude-haiku-5-5.html)
- [AWS Bedrock data protection](https://docs.aws.amazon.com/bedrock/latest/userguide/data-protection.html)
- anthropic-sdk-typescript: [bedrock-sdk README](https://github.com/anthropics/anthropic-sdk-typescript/tree/main/packages/bedrock-sdk), [src/index.ts](https://raw.githubusercontent.com/anthropics/anthropic-sdk-typescript/main/packages/bedrock-sdk/src/index.ts)
- [Next.js blog](https://nextjs.org/blog); [Pantheon release notes](https://docs.pantheon.io/release-notes/1?category=nextjs) (patched versions, third party)
- [Supabase pricing](https://supabase.com/pricing); [Supabase changelog #45329](https://supabase.com/changelog/45329-breaking-change-tables-not-exposed-to-data-and-graphql-api-automatically)
- [Vercel: Configuring regions for Functions](https://vercel.com/docs/functions/configuring-functions/region); [Vercel cron usage and pricing](https://docs.vercel.com/docs/cron-jobs/usage-and-pricing)
