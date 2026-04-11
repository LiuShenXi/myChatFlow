"use client"

import type { Message } from "ai"
import { Loader2, MessageCircleMore } from "lucide-react"
import { useEffect, useRef } from "react"
import { MessageItem } from "./MessageItem"

interface MessageListProps {
  messages: Message[]
  isLoading: boolean
}

export function MessageList({ messages, isLoading }: MessageListProps) {
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, isLoading])

  if (messages.length === 0 && !isLoading) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 px-4 text-muted-foreground">
        <MessageCircleMore className="h-12 w-12" />
        <div className="text-center">
          <h2 className="text-lg font-medium text-foreground">开始新对话</h2>
          <p className="mt-1 text-sm">输入消息开始与 AI 对话</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto px-4 py-6">
      <div className="space-y-6">
        {messages.map((message) => (
          <MessageItem key={message.id} message={message} />
        ))}
        {isLoading ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">正在思考...</span>
          </div>
        ) : null}
        <div ref={scrollRef} />
      </div>
    </div>
  )
}
