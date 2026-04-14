"use client"

import { useEffect, useState } from "react"
import { KeyRound, Pencil, Plus, Trash2, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

type CustomModelConfigDTO = {
  id: string
  name: string
  baseUrl: string
  modelId: string
  visionCapability: "unknown" | "vision" | "text-only"
  visionCapabilitySource: "manual" | "inferred" | "learned"
  hasApiKey: boolean
  updatedAt: string
}

type DraftState = {
  name: string
  baseUrl: string
  modelId: string
  visionCapability: "unknown" | "vision" | "text-only"
  apiKey: string
}

const EMPTY_DRAFT: DraftState = {
  name: "",
  baseUrl: "",
  modelId: "",
  visionCapability: "unknown",
  apiKey: ""
}

function formatVisionCapability(capability: CustomModelConfigDTO["visionCapability"]) {
  if (capability === "vision") {
    return "支持图片输入"
  }

  if (capability === "text-only") {
    return "不支持图片输入"
  }

  return "自动识别中"
}

function formatVisionCapabilitySource(
  source: CustomModelConfigDTO["visionCapabilitySource"]
) {
  if (source === "manual") {
    return "手动设置"
  }

  if (source === "learned") {
    return "失败学习"
  }

  return "系统识别"
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
      modelId: draft.modelId.trim(),
      visionCapability: draft.visionCapability,
      apiKey: draft.apiKey.trim()
    }

    if (!payload.name || !payload.baseUrl || !payload.modelId) {
      return
    }

    if (!editingId && !payload.apiKey) {
      return
    }

    const endpoint = editingId
      ? `/api/custom-models/${editingId}`
      : "/api/custom-models"
    const method = editingId ? "PATCH" : "POST"
    const body = JSON.stringify(
      payload.apiKey
        ? payload
        : {
            name: payload.name,
            baseUrl: payload.baseUrl,
            modelId: payload.modelId,
            visionCapability: payload.visionCapability
          }
    )

    setIsSaving(true)

    try {
      const response = await fetch(endpoint, {
        method,
        headers: {
          "Content-Type": "application/json"
        },
        body
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
      modelId: model.modelId,
      visionCapability: model.visionCapability,
      apiKey: ""
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
    draft.name.trim() &&
      draft.baseUrl.trim() &&
      draft.modelId.trim() &&
      (editingId ? true : draft.apiKey.trim())
  )

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h3 className="text-sm font-medium">自定义模型</h3>
        <p className="text-xs text-muted-foreground">
          每条自定义模型都会绑定自己的 Base URL、Model ID 和 API Key。
        </p>
      </div>

      <div className="grid gap-3 rounded-2xl border border-border p-4">
        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-1">
            <label className="text-sm font-medium" htmlFor="custom-model-name">
              自定义模型名称
            </label>
            <Input
              id="custom-model-name"
              value={draft.name}
              aria-label="Custom model name"
              placeholder="例如：GLM 5.1"
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
              aria-label="Custom model base URL"
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
              aria-label="Custom model ID"
              placeholder="gpt-4o-mini"
              onChange={(event) => updateDraft("modelId", event.target.value)}
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium" htmlFor="custom-model-api-key">
              自定义模型 API Key
            </label>
            <Input
              id="custom-model-api-key"
              type="password"
              value={draft.apiKey}
              aria-label="Custom model API Key"
              placeholder={editingId ? "留空表示不修改 API Key" : "sk-..."}
              onChange={(event) => updateDraft("apiKey", event.target.value)}
            />
          </div>

          <div className="space-y-1">
            <label
              className="text-sm font-medium"
              htmlFor="custom-model-vision-capability"
            >
              图片能力
            </label>
            <select
              id="custom-model-vision-capability"
              aria-label="Custom model vision capability"
              value={draft.visionCapability}
              className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none"
              onChange={(event) =>
                updateDraft(
                  "visionCapability",
                  event.target.value as DraftState["visionCapability"]
                )
              }
            >
              <option value="unknown">自动识别中</option>
              <option value="vision">支持图片输入</option>
              <option value="text-only">不支持图片输入</option>
            </select>
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
              <div className="text-xs text-muted-foreground">
                图片能力 {formatVisionCapability(model.visionCapability)}
              </div>
              <div className="text-xs text-muted-foreground">
                来源 {formatVisionCapabilitySource(model.visionCapabilitySource)}
              </div>
              {model.hasApiKey ? (
                <div className="flex items-center gap-1 text-xs text-green-600">
                  <KeyRound className="h-3.5 w-3.5" />
                  已配置密钥
                </div>
              ) : null}
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
