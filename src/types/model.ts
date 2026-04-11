export type ModelProvider = "openai" | "anthropic" | "deepseek"

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
  }
]

export function getModelConfig(modelId: string): ModelConfig | undefined {
  return AVAILABLE_MODELS.find((model) => model.id === modelId)
}
