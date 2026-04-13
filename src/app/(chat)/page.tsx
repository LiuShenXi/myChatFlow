"use client"

import type { FormEvent } from "react"
import { useEffect, useRef, useState } from "react"
import { useChat } from "ai/react"
import { useSession } from "next-auth/react"
import { AuthPrompt } from "@/components/auth/AuthPrompt"
import { InputArea } from "@/components/chat/InputArea"
import { MessageList } from "@/components/chat/MessageList"
import {
  buildImageAttachments,
  mapStoredMessageToUiMessage
} from "@/lib/chat/message-parts"
import { useChatStore } from "@/store/chat-store"
import { useSessionStore } from "@/store/session-store"
import { modelSupportsImageInput } from "@/types/model"

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
    setIsStreaming(isLoading)
  }, [isLoading, setIsStreaming])

  const isInputDisabled =
    isLoading || status !== "authenticated" || !currentSessionId

  const handleChatSubmit = (event: FormEvent<HTMLFormElement>) => {
    if (images.length > 0 && !modelSupportsImageInput(currentModel)) {
      event.preventDefault()
      setSubmitError("当前模型不支持图片输入，请切换到支持多模态的模型后再发送")
      return
    }

    setSubmitError(null)
    handleSubmit(event, {
      experimental_attachments: buildImageAttachments(images)
    })
  }

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
