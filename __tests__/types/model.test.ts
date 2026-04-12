import { AVAILABLE_MODELS, getModelConfig } from "@/types/model"

describe("model catalog", () => {
  it("should include domestic text models", () => {
    expect(AVAILABLE_MODELS.some((model) => model.id === "qwen-plus")).toBe(true)
    expect(AVAILABLE_MODELS.some((model) => model.id === "glm-5")).toBe(true)
    expect(AVAILABLE_MODELS.some((model) => model.id === "moonshot-v1-8k")).toBe(
      true
    )
    expect(
      AVAILABLE_MODELS.some((model) => model.id === "doubao-seed-1-6")
    ).toBe(true)
  })

  it("should resolve domestic model config by id", () => {
    expect(getModelConfig("qwen-plus")).toMatchObject({
      provider: "qwen",
      modelId: "qwen-plus"
    })

    expect(getModelConfig("moonshot-v1-8k")).toMatchObject({
      provider: "kimi",
      modelId: "moonshot-v1-8k"
    })
  })
})
