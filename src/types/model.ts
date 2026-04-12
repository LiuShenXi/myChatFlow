import type { ModelProvider } from "@/lib/ai/providers"

export interface ModelConfig {
  id: string
  name: string
  provider: ModelProvider
  modelId: string
  supportsVision: boolean
}

export const AVAILABLE_MODELS: ModelConfig[] = [
  {
    id: "gpt-4",
    name: "GPT-4",
    provider: "openai",
    modelId: "gpt-4",
    supportsVision: true
  },
  {
    id: "gpt-4o",
    name: "GPT-4o",
    provider: "openai",
    modelId: "gpt-4o",
    supportsVision: true
  },
  {
    id: "claude-3-5-sonnet",
    name: "Claude 3.5 Sonnet",
    provider: "anthropic",
    modelId: "claude-3-5-sonnet-20241022",
    supportsVision: true
  },
  {
    id: "deepseek-chat",
    name: "DeepSeek Chat",
    provider: "deepseek",
    modelId: "deepseek-chat",
    supportsVision: false
  },
  {
    id: "qwen-plus",
    name: "Qwen Plus",
    provider: "qwen",
    modelId: "qwen-plus",
    supportsVision: false
  },
  {
    id: "qwen-turbo",
    name: "Qwen Turbo",
    provider: "qwen",
    modelId: "qwen-turbo",
    supportsVision: false
  },
  {
    id: "glm-5",
    name: "GLM-5",
    provider: "glm",
    modelId: "glm-5",
    supportsVision: false
  },
  {
    id: "glm-4-7",
    name: "GLM-4.7",
    provider: "glm",
    modelId: "glm-4.7",
    supportsVision: false
  },
  {
    id: "moonshot-v1-8k",
    name: "Kimi Moonshot v1 8K",
    provider: "kimi",
    modelId: "moonshot-v1-8k",
    supportsVision: false
  },
  {
    id: "kimi-k2",
    name: "Kimi K2",
    provider: "kimi",
    modelId: "kimi-k2-0905-preview",
    supportsVision: false
  },
  {
    id: "doubao-seed-1-6",
    name: "豆包 Seed 1.6",
    provider: "doubao",
    modelId: "doubao-seed-1.6",
    supportsVision: false
  },
  {
    id: "doubao-seed-1-6-flash",
    name: "豆包 Seed 1.6 Flash",
    provider: "doubao",
    modelId: "doubao-seed-1.6-flash",
    supportsVision: false
  }
]

export const CUSTOM_MODEL_PREFIX = "custom:"

export function getModelConfig(modelId: string): ModelConfig | undefined {
  return AVAILABLE_MODELS.find((model) => model.id === modelId)
}

export function isCustomModelId(modelId: string) {
  return modelId.startsWith(CUSTOM_MODEL_PREFIX)
}

export function parseCustomModelId(modelId: string) {
  if (!isCustomModelId(modelId)) {
    return null
  }

  return modelId.slice(CUSTOM_MODEL_PREFIX.length) || null
}

export function modelSupportsImageInput(modelId: string) {
  if (isCustomModelId(modelId)) {
    return true
  }

  return getModelConfig(modelId)?.supportsVision ?? false
}
