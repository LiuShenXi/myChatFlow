import { createAnthropic } from "@ai-sdk/anthropic"
import { createOpenAI } from "@ai-sdk/openai"
import type { LanguageModelV1 } from "@ai-sdk/provider"

export type ModelProvider =
  | "openai"
  | "anthropic"
  | "deepseek"
  | "qwen"
  | "glm"
  | "kimi"
  | "doubao"

type OpenAICompatibleProviderId = Exclude<ModelProvider, "anthropic">

type OpenAICompatibleProviderMeta = {
  id: OpenAICompatibleProviderId
  name: string
  baseURL?: string
  compatibility: "compatible" | "strict"
  apiKeyPlaceholder: string
}

const OPENAI_COMPATIBLE_PROVIDER_META: Record<
  OpenAICompatibleProviderId,
  OpenAICompatibleProviderMeta
> = {
  openai: {
    id: "openai",
    name: "OpenAI",
    compatibility: "strict",
    apiKeyPlaceholder: "sk-..."
  },
  deepseek: {
    id: "deepseek",
    name: "DeepSeek",
    baseURL: "https://api.deepseek.com/v1",
    compatibility: "compatible",
    apiKeyPlaceholder: "sk-..."
  },
  qwen: {
    id: "qwen",
    name: "Qwen",
    baseURL: "https://dashscope.aliyuncs.com/compatible-mode/v1",
    compatibility: "compatible",
    apiKeyPlaceholder: "sk-..."
  },
  glm: {
    id: "glm",
    name: "GLM",
    baseURL: "https://open.bigmodel.cn/api/paas/v4",
    compatibility: "compatible",
    apiKeyPlaceholder: "your-glm-api-key"
  },
  kimi: {
    id: "kimi",
    name: "Kimi",
    baseURL: "https://api.moonshot.cn/v1",
    compatibility: "compatible",
    apiKeyPlaceholder: "sk-..."
  },
  doubao: {
    id: "doubao",
    name: "豆包",
    baseURL: "https://ark.cn-beijing.volces.com/api/v3",
    compatibility: "compatible",
    apiKeyPlaceholder: "your-doubao-api-key"
  }
}

const API_KEY_PROVIDER_ORDER: ModelProvider[] = [
  "openai",
  "anthropic",
  "deepseek",
  "qwen",
  "glm",
  "kimi",
  "doubao"
]

export function getOpenAICompatibleProviderMeta(
  provider: OpenAICompatibleProviderId
) {
  return OPENAI_COMPATIBLE_PROVIDER_META[provider]
}

export function getApiKeyProviders(): Array<{
  id: ModelProvider
  name: string
  placeholder: string
}> {
  return API_KEY_PROVIDER_ORDER.map((provider) => {
    if (provider === "anthropic") {
      return {
        id: "anthropic",
        name: "Anthropic",
        placeholder: "sk-ant-..."
      }
    }

    const metadata = getOpenAICompatibleProviderMeta(provider)

    return {
      id: metadata.id,
      name: metadata.name,
      placeholder: metadata.apiKeyPlaceholder
    }
  })
}

function createOpenAICompatibleModel(
  provider: OpenAICompatibleProviderId,
  modelId: string,
  apiKey: string
) {
  const metadata = getOpenAICompatibleProviderMeta(provider)
  const client = createOpenAI({
    apiKey,
    baseURL: metadata.baseURL,
    compatibility: metadata.compatibility,
    name: metadata.id
  })

  return client(modelId)
}

export function getProvider(
  provider: ModelProvider,
  modelId: string,
  apiKey: string
): LanguageModelV1 {
  if (provider === "anthropic") {
    return createAnthropic({
      apiKey
    })(modelId)
  }

  const metadata = OPENAI_COMPATIBLE_PROVIDER_META[provider]

  if (!metadata) {
    throw new Error(`Unsupported provider: ${provider}`)
  }

  return createOpenAICompatibleModel(provider, modelId, apiKey)
}

export function createProviderClient(
  provider: Exclude<ModelProvider, "anthropic">,
  apiKey: string
) {
  const metadata = getOpenAICompatibleProviderMeta(provider)

  return createOpenAI({
    apiKey,
    baseURL: metadata.baseURL,
    compatibility: metadata.compatibility,
    name: metadata.id
  })
}
