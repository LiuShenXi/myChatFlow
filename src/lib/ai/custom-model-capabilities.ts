export type VisionCapability = "unknown" | "vision" | "text-only"
export type VisionCapabilitySource = "manual" | "inferred" | "learned"
export type CustomModelProviderHint = "glm" | "unknown"

type CustomModelVisionConfig = {
  baseUrl: string
  modelId: string
  visionCapability: VisionCapability
  visionCapabilitySource: VisionCapabilitySource
}

function inferVisionCapabilityFromKnownModels(
  providerHint: CustomModelProviderHint,
  modelId: string
): VisionCapability {
  const normalizedModelId = modelId.trim().toLowerCase()

  if (providerHint === "glm") {
    if (normalizedModelId === "glm-5v-turbo" || normalizedModelId === "glm-4.6v") {
      return "vision"
    }

    if (
      normalizedModelId === "glm-5.1" ||
      normalizedModelId === "glm-5" ||
      normalizedModelId === "glm-4.7"
    ) {
      return "text-only"
    }
  }

  return "unknown"
}

export function inferProviderHintFromCustomModel(model: {
  baseUrl: string
  modelId: string
}): CustomModelProviderHint {
  const normalizedBaseUrl = model.baseUrl.trim().toLowerCase()
  const normalizedModelId = model.modelId.trim().toLowerCase()

  if (
    normalizedBaseUrl.includes("bigmodel.cn") ||
    normalizedModelId.startsWith("glm-")
  ) {
    return "glm"
  }

  return "unknown"
}

export function resolveCustomModelVisionCapability(
  config: CustomModelVisionConfig
): {
  capability: VisionCapability
  source: VisionCapabilitySource
} {
  if (config.visionCapability !== "unknown") {
    return {
      capability: config.visionCapability,
      source: config.visionCapabilitySource
    }
  }

  const inferredCapability = inferVisionCapabilityFromKnownModels(
    inferProviderHintFromCustomModel(config),
    config.modelId
  )

  return {
    capability: inferredCapability,
    source: "inferred"
  }
}

export function classifyVisionCapabilityFailure(options: {
  providerHint: CustomModelProviderHint
  error: unknown
}) {
  const message =
    options.error instanceof Error ? options.error.message : String(options.error)

  if (options.providerHint === "glm") {
    if (
      message.includes("仅支持纯文本") ||
      message.includes("不支持图片输入") ||
      message.includes("当前模型不支持图片输入")
    ) {
      return "not-vision-supported" as const
    }
  }

  return "unknown" as const
}
