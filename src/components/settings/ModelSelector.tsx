"use client"

import { useEffect, useState } from "react"
import { buttonVariants } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu"
import { useSessionStore } from "@/store/session-store"
import { AVAILABLE_MODELS, CUSTOM_MODEL_PREFIX } from "@/types/model"

type CustomModelConfigDTO = {
  id: string
  name: string
  baseUrl: string
  modelId: string
  updatedAt?: string
}

function formatModelLabel(modelId: string, modelName: string) {
  const model = AVAILABLE_MODELS.find((item) => item.id === modelId)

  if (model?.supportsVision) {
    return `${modelName} 视觉`
  }

  return modelName
}

export function ModelSelector() {
  const currentModel = useSessionStore((state) => state.currentModel)
  const setModel = useSessionStore((state) => state.setModel)
  const [customModels, setCustomModels] = useState<CustomModelConfigDTO[]>([])

  useEffect(() => {
    async function loadCustomModels() {
      try {
        const response = await fetch("/api/custom-models")

        if (!response.ok) {
          return
        }

        const models = (await response.json()) as CustomModelConfigDTO[]
        setCustomModels(models)
      } catch {
        // Ignore unauthenticated and network failures.
      }
    }

    void loadCustomModels()
  }, [])

  const currentCustomModel = customModels.find(
    (model) => currentModel === `${CUSTOM_MODEL_PREFIX}${model.id}`
  )
  const currentModelConfig = AVAILABLE_MODELS.find(
    (model) => model.id === currentModel
  )

  const currentModelName =
    currentCustomModel?.name ??
    formatModelLabel(currentModel, currentModelConfig?.name ?? currentModel)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="当前模型"
        className={buttonVariants({ variant: "outline", size: "sm" })}
      >
        {currentModelName}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {AVAILABLE_MODELS.map((model) => (
          <DropdownMenuItem key={model.id} onClick={() => setModel(model.id)}>
            {formatModelLabel(model.id, model.name)}
          </DropdownMenuItem>
        ))}

        {customModels.length > 0 ? (
          <>
            <DropdownMenuSeparator />
            {customModels.map((model) => (
              <DropdownMenuItem
                key={model.id}
                onClick={() => setModel(`${CUSTOM_MODEL_PREFIX}${model.id}`)}
              >
                {model.name}
              </DropdownMenuItem>
            ))}
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
