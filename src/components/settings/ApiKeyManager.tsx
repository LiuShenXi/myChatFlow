"use client"

import { useEffect, useState } from "react"
import { Check, Eye, EyeOff, Save, Trash2 } from "lucide-react"
import { getApiKeyProviders, type ModelProvider } from "@/lib/ai/providers"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export function ApiKeyManager() {
  const providers = getApiKeyProviders()
  const [keys, setKeys] = useState<Partial<Record<ModelProvider, string>>>({})
  const [savedProviders, setSavedProviders] = useState<ModelProvider[]>([])
  const [showKeys, setShowKeys] = useState<Partial<Record<ModelProvider, boolean>>>(
    {}
  )
  const [savingProvider, setSavingProvider] = useState<ModelProvider | null>(null)

  useEffect(() => {
    async function loadKeys() {
      try {
        const response = await fetch("/api/keys")

        if (!response.ok) {
          return
        }

        const data = (await response.json()) as Array<{ provider: ModelProvider }>
        setSavedProviders(data.map((item) => item.provider))
      } catch {
        // Ignore load failures and keep the current UI state.
      }
    }

    void loadKeys()
  }, [])

  const handleSave = async (provider: ModelProvider) => {
    const apiKey = keys[provider]?.trim()

    if (!apiKey) {
      return
    }

    setSavingProvider(provider)

    try {
      const response = await fetch("/api/keys", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          provider,
          apiKey
        })
      })

      if (!response.ok) {
        return
      }

      setSavedProviders((current) =>
        current.includes(provider) ? current : [...current, provider]
      )
      setKeys((current) => ({
        ...current,
        [provider]: ""
      }))
    } finally {
      setSavingProvider(null)
    }
  }

  const handleDelete = async (provider: ModelProvider) => {
    try {
      const response = await fetch("/api/keys", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ provider })
      })

      if (!response.ok) {
        return
      }

      setSavedProviders((current) => current.filter((item) => item !== provider))
    } catch {
      // Ignore delete failures and keep the current UI state.
    }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h3 className="text-sm font-medium">API Keys</h3>
        <p className="text-xs text-muted-foreground">
          所有密钥都会在服务端使用 AES-256-GCM 加密存储。
        </p>
      </div>

      {providers.map((provider) => {
        const inputId = `${provider.id}-api-key`
        const isSaved = savedProviders.includes(provider.id)
        const isVisible = Boolean(showKeys[provider.id])

        return (
          <div key={provider.id} className="space-y-2">
            <div className="flex items-center justify-between">
              <label htmlFor={inputId} className="text-sm font-medium">
                {provider.name}
              </label>
              {isSaved ? (
                <span className="flex items-center gap-1 text-xs text-green-600">
                  <Check className="h-3 w-3" />
                  已配置
                </span>
              ) : null}
            </div>

            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  id={inputId}
                  type={isVisible ? "text" : "password"}
                  placeholder={
                    isSaved ? `输入新的 ${provider.name} Key 以更新` : provider.placeholder
                  }
                  value={keys[provider.id] ?? ""}
                  onChange={(event) =>
                    setKeys((current) => ({
                      ...current,
                      [provider.id]: event.target.value
                    }))
                  }
                  aria-label={`${provider.name} API Key`}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="absolute top-1/2 right-1 -translate-y-1/2"
                  aria-label={`${isVisible ? "隐藏" : "显示"} ${provider.name} API Key`}
                  onClick={() =>
                    setShowKeys((current) => ({
                      ...current,
                      [provider.id]: !current[provider.id]
                    }))
                  }
                >
                  {isVisible ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>

              <Button
                type="button"
                size="icon"
                aria-label={`保存 ${provider.name} API Key`}
                disabled={!keys[provider.id]?.trim() || savingProvider === provider.id}
                onClick={() => void handleSave(provider.id)}
              >
                <Save className="h-4 w-4" />
              </Button>

              {isSaved ? (
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  aria-label={`删除 ${provider.name} API Key`}
                  onClick={() => void handleDelete(provider.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              ) : null}
            </div>
          </div>
        )
      })}
    </div>
  )
}
