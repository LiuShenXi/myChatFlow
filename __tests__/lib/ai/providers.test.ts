import { getProvider, type ModelProvider } from "@/lib/ai/providers"

describe("AI providers", () => {
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

  it("should throw for unknown provider", () => {
    expect(() =>
      getProvider("unknown" as ModelProvider, "model", "key")
    ).toThrow("Unsupported provider: unknown")
  })
})
