"use client"

import { buttonVariants } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu"
import { useSessionStore } from "@/store/session-store"
import { AVAILABLE_MODELS } from "@/types/model"

export function ModelSelector() {
  const currentModel = useSessionStore((state) => state.currentModel)
  const setModel = useSessionStore((state) => state.setModel)

  const currentModelName =
    AVAILABLE_MODELS.find((model) => model.id === currentModel)?.name ??
    currentModel

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
            {model.name}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
