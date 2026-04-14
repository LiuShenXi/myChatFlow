import {
  classifyVisionCapabilityFailure,
  inferProviderHintFromCustomModel,
  resolveCustomModelVisionCapability
} from "@/lib/ai/custom-model-capabilities"

describe("custom model capabilities", () => {
  it("should infer glm vision capability from known multimodal model ids", () => {
    expect(
      resolveCustomModelVisionCapability({
        baseUrl: "https://open.bigmodel.cn/api/paas/v4",
        modelId: "glm-5v-turbo",
        visionCapability: "unknown",
        visionCapabilitySource: "inferred"
      })
    ).toEqual({
      capability: "vision",
      source: "inferred"
    })
  })

  it("should infer glm text-only capability from known text model ids", () => {
    expect(
      resolveCustomModelVisionCapability({
        baseUrl: "https://open.bigmodel.cn/api/paas/v4",
        modelId: "glm-5.1",
        visionCapability: "unknown",
        visionCapabilitySource: "inferred"
      })
    ).toEqual({
      capability: "text-only",
      source: "inferred"
    })
  })

  it("should keep manual capability when user has explicitly chosen one", () => {
    expect(
      resolveCustomModelVisionCapability({
        baseUrl: "https://open.bigmodel.cn/api/paas/v4",
        modelId: "glm-5.1",
        visionCapability: "vision",
        visionCapabilitySource: "manual"
      })
    ).toEqual({
      capability: "vision",
      source: "manual"
    })
  })

  it("should infer glm provider hint from bigmodel base url", () => {
    expect(
      inferProviderHintFromCustomModel({
        baseUrl: "https://open.bigmodel.cn/api/paas/v4",
        modelId: "glm-5.1"
      })
    ).toBe("glm")
  })

  it("should classify clear glm non-vision failures", () => {
    expect(
      classifyVisionCapabilityFailure({
        providerHint: "glm",
        error: new Error("仅支持纯文本")
      })
    ).toBe("not-vision-supported")
  })

  it("should ignore ambiguous failures", () => {
    expect(
      classifyVisionCapabilityFailure({
        providerHint: "glm",
        error: new Error("API 调用参数有误，请检查文档。")
      })
    ).toBe("unknown")
  })
})
