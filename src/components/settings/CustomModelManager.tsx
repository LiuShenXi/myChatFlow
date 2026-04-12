"use client"

import { useEffect, useState } from "react"
import { Pencil, Plus, Trash2, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

type CustomModelConfigDTO = {
  id: string
  name: string
  baseUrl: string
  modelId: string
  updatedAt: string
}

type DraftState = {
  name: string
  baseUrl: string
  modelId: string
}

const EMPTY_DRAFT: DraftState = {
  name: "",
  baseUrl: "",
  modelId: ""
}

export function CustomModelManager() {
  const [models, setModels] = useState<CustomModelConfigDTO[]>([])
  const [draft, setDraft] = useState<DraftState>(EMPTY_DRAFT)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    async function loadModels() {
      try {
        const response = await fetch("/api/custom-models")

        if (!response.ok) {
          return
        }

        const data = (await response.json()) as CustomModelConfigDTO[]
        setModels(data)
      } catch {
        // Ignore load failures and keep the current UI state.
      }
    }

    void loadModels()
  }, [])

  function updateDraft<K extends keyof DraftState>(key: K, value: DraftState[K]) {
    setDraft((current) => ({
      ...current,
      [key]: value
    }))
  }

  function resetDraft() {
    setDraft(EMPTY_DRAFT)
    setEditingId(null)
  }

  async function handleSave() {
    const payload = {
      name: draft.name.trim(),
      baseUrl: draft.baseUrl.trim(),
      modelId: draft.modelId.trim()
    }

    if (!payload.name || !payload.baseUrl || !payload.modelId) {
      return
    }

    const endpoint = editingId
      ? `/api/custom-models/${editingId}`
      : "/api/custom-models"
    const method = editingId ? "PATCH" : "POST"

    setIsSaving(true)

    try {
      const response = await fetch(endpoint, {
        method,
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      })

      if (!response.ok) {
        return
      }

      const saved = (await response.json()) as CustomModelConfigDTO

      setModels((current) =>
        editingId
          ? current.map((model) => (model.id === editingId ? saved : model))
          : [saved, ...current]
      )
      resetDraft()
    } finally {
      setIsSaving(false)
    }
  }

  function handleEdit(model: CustomModelConfigDTO) {
    setEditingId(model.id)
    setDraft({
      name: model.name,
      baseUrl: model.baseUrl,
      modelId: model.modelId
    })
  }

  async function handleDelete(id: string) {
    try {
      const response = await fetch(`/api/custom-models/${id}`, {
        method: "DELETE"
      })

      if (!response.ok) {
        return
      }

      setModels((current) => current.filter((model) => model.id !== id))

      if (editingId === id) {
        resetDraft()
      }
    } catch {
      // Ignore delete failures and keep the current UI state.
    }
  }

  const canSave = Boolean(
    draft.name.trim() && draft.baseUrl.trim() && draft.modelId.trim()
  )

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h3 className="text-sm font-medium">自定义模型</h3>
        <p className="text-xs text-muted-foreground">
          保存你自己的 OpenAI-compatible Base URL 和 Model ID。
        </p>
      </div>

      <div className="grid gap-3 rounded-2xl border border-border p-4">
        <div className="grid gap-3 md:grid-cols-3">
          <div className="space-y-1">
            <label className="text-sm font-medium" htmlFor="custom-model-name">
              自定义模型名称
            </label>
            <Input
              id="custom-model-name"
              value={draft.name}
              aria-label="自定义模型名称"
              placeholder="例如：My Gateway"
              onChange={(event) => updateDraft("name", event.target.value)}
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium" htmlFor="custom-model-base-url">
              自定义 Base URL
            </label>
            <Input
              id="custom-model-base-url"
              value={draft.baseUrl}
              aria-label="自定义 Base URL"
              placeholder="https://example.com/v1"
              onChange={(event) => updateDraft("baseUrl", event.target.value)}
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium" htmlFor="custom-model-id">
              自定义 Model ID
            </label>
            <Input
              id="custom-model-id"
              value={draft.modelId}
              aria-label="自定义 Model ID"
              placeholder="gpt-4o-mini"
              onChange={(event) => updateDraft("modelId", event.target.value)}
            />
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            type="button"
            onClick={() => void handleSave()}
            disabled={!canSave || isSaving}
          >
            {editingId ? <Pencil className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            保存自定义模型
          </Button>

          {editingId ? (
            <Button type="button" variant="ghost" onClick={resetDraft}>
              <X className="h-4 w-4" />
              取消编辑
            </Button>
          ) : null}
        </div>
      </div>

      <div className="space-y-2">
        {models.map((model) => (
          <div
            key={model.id}
            className="flex flex-col gap-3 rounded-2xl border border-border p-4 md:flex-row md:items-center md:justify-between"
          >
            <div className="space-y-1">
              <div className="text-sm font-medium">{model.name}</div>
              <div className="text-xs text-muted-foreground">{model.baseUrl}</div>
              <div className="text-xs text-muted-foreground">{model.modelId}</div>
            </div>

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                aria-label={`编辑 ${model.name}`}
                onClick={() => handleEdit(model)}
              >
                <Pencil className="h-4 w-4" />
                编辑
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                aria-label={`删除 ${model.name}`}
                onClick={() => void handleDelete(model.id)}
              >
                <Trash2 className="h-4 w-4" />
                删除
              </Button>
            </div>
          </div>
        ))}

        {models.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-4 text-sm text-muted-foreground">
            还没有自定义模型，先添加一条配置吧。
          </div>
        ) : null}
      </div>
    </div>
  )
}
