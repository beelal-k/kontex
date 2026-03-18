/**
 * Shared LLM model factory — creates a provider-appropriate model instance.
 *
 * Centralises the provider if/else chain so that post-commit extraction,
 * init AI extraction, and any future LLM callers share one code path.
 */

import type { KontexConfig } from "./config.js";

/**
 * Creates an AI SDK-compatible model for the configured LLM provider.
 * Returns `null` if the provider is "none" or unsupported.
 */
export async function createLLMModel(
  config: KontexConfig,
  token: string | null,
): Promise<ReturnType<ReturnType<typeof import("@ai-sdk/openai").createOpenAI>> | null> {
  const { createOpenAI } = await import("@ai-sdk/openai");

  switch (config.llm.provider) {
    case "github-models":
      return createOpenAI({
        baseURL: "https://models.inference.ai.azure.com",
        apiKey: token ?? "",
      })(config.llm.model);

    case "openai":
      return createOpenAI({
        apiKey: config.llm.apiKey ?? process.env.OPENAI_API_KEY ?? "",
      })(config.llm.model);

    case "ollama":
      return createOpenAI({
        baseURL: "http://localhost:11434/v1",
        apiKey: "ollama",
      })(config.llm.model);

    // TODO: Implement Anthropic provider support via @ai-sdk/anthropic.
    // Anthropic is listed as a valid provider in the config type but is not
    // yet wired up. When adding support, install @ai-sdk/anthropic and add
    // a case here that creates the model using createAnthropic().
    case "anthropic":
      return null;

    case "none":
      return null;

    default:
      return null;
  }
}
