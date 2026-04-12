import {
  createCustomOpenAICompatibleModel,
  getOpenAICompatibleProviderMeta,
  getProvider,
  type ModelProvider
} from "@/lib/ai/providers"

describe("AI providers", () => {
  it('should expose qwen metadata as an openai-compatible provider', () => {
    expect(getOpenAICompatibleProviderMeta("qwen")).toMatchObject({
      id: "qwen",
      name: "Qwen",
      baseURL: "https://dashscope.aliyuncs.com/compatible-mode/v1"
    })
  })

  it('should return openai provider for "openai"', () => {
    const provider = getProvider("openai", "gpt-4", "test-key")

    expect(provider).toBeDefined()
  })

  it('should return anthropic provider for "anthropic"', () => {
    const provider = getProvider(
      "anthropic",
      "claude-3-5-sonnet-20241022",
      "test-key"
    )

    expect(provider).toBeDefined()
  })

  it('should return deepseek provider for "deepseek"', () => {
    const provider = getProvider("deepseek", "deepseek-chat", "test-key")

    expect(provider).toBeDefined()
  })

  it('should return qwen provider for "qwen"', () => {
    const provider = getProvider("qwen", "qwen-plus", "test-key")

    expect(provider).toBeDefined()
  })

  it('should return glm provider for "glm"', () => {
    const provider = getProvider("glm", "glm-5", "test-key")

    expect(provider).toBeDefined()
  })

  it('should return kimi provider for "kimi"', () => {
    const provider = getProvider("kimi", "moonshot-v1-8k", "test-key")

    expect(provider).toBeDefined()
  })

  it('should return doubao provider for "doubao"', () => {
    const provider = getProvider("doubao", "doubao-seed-1.6", "test-key")

    expect(provider).toBeDefined()
  })

  it("should create a custom compatible provider with a dynamic base url", () => {
    const provider = createCustomOpenAICompatibleModel(
      "https://example.com/v1",
      "gpt-4o-mini",
      "test-key"
    )

    expect(provider).toBeDefined()
  })

  it("should throw for unknown provider", () => {
    expect(() =>
      getProvider("unknown" as ModelProvider, "model", "key")
    ).toThrow("Unsupported provider: unknown")
  })
})
