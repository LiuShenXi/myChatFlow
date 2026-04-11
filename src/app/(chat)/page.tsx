"use client"

import { useEffect } from "react"
import { useChat } from "ai/react"
import { InputArea } from "@/components/chat/InputArea"
import { MessageList } from "@/components/chat/MessageList"
import { useChatStore } from "@/store/chat-store"
import { useSessionStore } from "@/store/session-store"

export default function ChatPage() {
  const currentSessionId = useSessionStore((state) => state.currentSessionId)
  const currentModel = useSessionStore((state) => state.currentModel)
  const setIsStreaming = useChatStore((state) => state.setIsStreaming)

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
    if (!currentSessionId) {
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
        setMessages(
          data.messages.map(
            (message: { id: string; role: string; content: string }) => ({
              id: message.id,
              role: message.role,
              content: message.content
            })
          )
        )
      } catch {
        // Ignore message loading failures and keep the current UI state.
      }
    }

    void loadMessages()
  }, [currentSessionId, setMessages])

  useEffect(() => {
    setIsStreaming(isLoading)
  }, [isLoading, setIsStreaming])

  return (
    <>
      <MessageList messages={messages} isLoading={isLoading} />
      <InputArea
        input={input}
        setInput={setInput}
        onSubmit={handleSubmit}
        disabled={isLoading || !currentSessionId}
      />
    </>
  )
}
