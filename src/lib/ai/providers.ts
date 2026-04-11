import { createAnthropic } from "@ai-sdk/anthropic"
import { createOpenAI } from "@ai-sdk/openai"
import type { LanguageModelV1 } from "@ai-sdk/provider"

export type ModelProvider = "openai" | "anthropic" | "deepseek"

export function getProvider(
  provider: ModelProvider,
  modelId: string,
  apiKey: string
): LanguageModelV1 {
  switch (provider) {
    case "openai":
      return createOpenAI({
        apiKey
      })(modelId)
    case "anthropic":
      return createAnthropic({
        apiKey
      })(modelId)
    case "deepseek": {
      const deepseek = createOpenAI({
        apiKey,
        baseURL: "https://api.deepseek.com/v1",
        compatibility: "compatible",
        name: "deepseek"
      })

      return deepseek(modelId)
    }
    default:
      throw new Error(`Unsupported provider: ${provider}`)
  }
}

export function createProviderClient(
  provider: Exclude<ModelProvider, "deepseek">,
  apiKey: string
) {
  if (provider === "openai") {
    return createOpenAI({
      apiKey,
      compatibility: "strict"
    })
  }

  return createAnthropic({
    apiKey
  })
}
