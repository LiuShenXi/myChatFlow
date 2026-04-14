"use client"

import type { FormEvent } from "react"
import { useEffect, useRef, useState } from "react"
import { useChat } from "ai/react"
import { useSession } from "next-auth/react"
import { AuthPrompt } from "@/components/auth/AuthPrompt"
import { InputArea } from "@/components/chat/InputArea"
import { MessageList } from "@/components/chat/MessageList"
import {
  resolveCustomModelVisionCapability,
  type VisionCapability,
  type VisionCapabilitySource
} from "@/lib/ai/custom-model-capabilities"
import {
  buildImageAttachments,
  mapStoredMessageToUiMessage
} from "@/lib/chat/message-parts"
import { useChatStore } from "@/store/chat-store"
import { useSessionStore } from "@/store/session-store"
import {
  isCustomModelId,
  modelSupportsImageInput,
  parseCustomModelId
} from "@/types/model"

type CustomModelConfigDTO = {
  id: string
  baseUrl: string
  modelId: string
  visionCapability: VisionCapability
  visionCapabilitySource: VisionCapabilitySource
}

export default function ChatPage() {
  const { status } = useSession()
  const currentSessionId = useSessionStore((state) => state.currentSessionId)
  const currentModel = useSessionStore((state) => state.currentModel)
  const setIsStreaming = useChatStore((state) => state.setIsStreaming)
  const images = useChatStore((state) => state.images)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const previousReadyRef = useRef(false)
  const previousSessionIdRef = useRef<string | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [customModels, setCustomModels] = useState<CustomModelConfigDTO[]>([])
  const [hasLoadedCustomModels, setHasLoadedCustomModels] = useState(false)
  const currentCustomModelId = parseCustomModelId(currentModel)
  const selectedCustomModel = currentCustomModelId
    ? customModels.find((model) => model.id === currentCustomModelId) ?? null
    : null
  const resolvedCustomVisionCapability = selectedCustomModel
    ? resolveCustomModelVisionCapability(selectedCustomModel)
    : null

  const {
    messages,
    input,
    setInput,
    handleSubmit,
    isLoading,
    setMessages
  } = useChat({
    api: "/api/chat",
    body: {
      sessionId: currentSessionId,
      model: currentModel
    }
  })

  useEffect(() => {
    if (status !== "authenticated" || !currentSessionId) {
      setMessages([])
      return
    }

    async function loadMessages() {
      try {
        const response = await fetch(`/api/sessions/${currentSessionId}`)

        if (!response.ok) {
          return
        }

        const data = await response.json()
        setMessages(data.messages.map(mapStoredMessageToUiMessage))
      } catch {
        // Ignore message loading failures and keep the current UI state.
      }
    }

    void loadMessages()
  }, [currentSessionId, setMessages, status])

  useEffect(() => {
    if (status !== "authenticated" || !currentCustomModelId) {
      setCustomModels([])
      setHasLoadedCustomModels(false)
      return
    }

    let isCancelled = false
    setHasLoadedCustomModels(false)

    async function loadCustomModels() {
      try {
        const response = await fetch("/api/custom-models")

        if (!response.ok) {
          if (!isCancelled) {
            setCustomModels([])
          }
          return
        }

        const data = (await response.json()) as CustomModelConfigDTO[]

        if (!isCancelled) {
          setCustomModels(data)
        }
      } catch {
        if (!isCancelled) {
          setCustomModels([])
        }
      } finally {
        if (!isCancelled) {
          setHasLoadedCustomModels(true)
        }
      }
    }

    void loadCustomModels()

    return () => {
      isCancelled = true
    }
  }, [currentCustomModelId, status])

  useEffect(() => {
    setIsStreaming(isLoading)
  }, [isLoading, setIsStreaming])

  const isInputDisabled =
    isLoading || status !== "authenticated" || !currentSessionId

  const getImageSubmitError = () => {
    if (images.length === 0) {
      return null
    }

    if (!isCustomModelId(currentModel)) {
      return modelSupportsImageInput(currentModel)
        ? null
        : "当前模型不支持图片输入，请切换到支持多模态的模型后再发送"
    }

    if (!hasLoadedCustomModels || !selectedCustomModel) {
      return null
    }

    return resolvedCustomVisionCapability?.capability === "text-only"
      ? "当前模型不支持图片输入，请切换到支持多模态的模型后再发送"
      : null
  }

  const handleChatSubmit = (event: FormEvent<HTMLFormElement>) => {
    const imageSubmitError = getImageSubmitError()

    if (imageSubmitError) {
      event.preventDefault()
      setSubmitError(imageSubmitError)
      return false
    }

    setSubmitError(null)
    handleSubmit(event, {
      experimental_attachments: buildImageAttachments(images)
    })

    return true
  }

  useEffect(() => {
    if (images.length === 0) {
      setSubmitError(null)
    }
  }, [images.length])

  useEffect(() => {
    setSubmitError(null)
  }, [currentModel])

  useEffect(() => {
    const isReady = status === "authenticated" && Boolean(currentSessionId)
    const becameReady = !previousReadyRef.current && isReady
    const sessionChanged = previousSessionIdRef.current !== currentSessionId

    const activeElement = document.activeElement
    const hasInputLikeFocus =
      activeElement instanceof HTMLElement &&
      (activeElement.tagName === "INPUT" ||
        activeElement.tagName === "TEXTAREA" ||
        activeElement.tagName === "SELECT" ||
        activeElement.isContentEditable)

    if (isReady && !isLoading && (becameReady || sessionChanged) && !hasInputLikeFocus) {
      inputRef.current?.focus()
    }

    previousReadyRef.current = isReady
    previousSessionIdRef.current = currentSessionId
  }, [currentSessionId, isLoading, status])

  return (
    <>
      {status === "unauthenticated" ? (
        <div className="px-4 pt-4">
          <AuthPrompt
            title="登录后即可开始对话"
            description="当前未登录，无法创建会话、发送消息或保存 API Key。"
          />
        </div>
      ) : null}
      <MessageList messages={messages} isLoading={isLoading} />
      <InputArea
        ref={inputRef}
        input={input}
        setInput={setInput}
        onSubmit={handleChatSubmit}
        disabled={isInputDisabled}
        errorMessage={submitError}
      />
    </>
  )
}
