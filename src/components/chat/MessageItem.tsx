"use client"

import type { Message } from "ai"
import { Bot, User } from "lucide-react"
import { extractImageUrls } from "@/lib/chat/message-parts"
import { MarkdownRenderer } from "./MarkdownRenderer"

interface MessageItemProps {
  message: Message
}

export function MessageItem({ message }: MessageItemProps) {
  const isUser = message.role === "user"
  const content =
    typeof message.content === "string" ? message.content : String(message.content)
  const imageUrls = isUser ? extractImageUrls(message.experimental_attachments) : []

  return (
    <div className={`flex gap-4 ${isUser ? "flex-row-reverse" : ""}`}>
      <div
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
          isUser ? "bg-primary text-primary-foreground" : "bg-muted"
        }`}
      >
        {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </div>

      <div className={`flex-1 space-y-2 overflow-hidden ${isUser ? "text-right" : ""}`}>
        <div
          className={`inline-block max-w-full rounded-lg px-4 py-2 text-left ${
            isUser
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-foreground"
          }`}
        >
          {isUser ? (
            <p className="whitespace-pre-wrap break-words">{content}</p>
          ) : (
            <MarkdownRenderer content={content} />
          )}
        </div>

        {isUser && imageUrls.length > 0 ? (
          <div className="flex flex-wrap justify-end gap-2">
            {imageUrls.map((imageUrl, index) => (
              <div
                key={`${imageUrl}-${index}`}
                className="overflow-hidden rounded-lg border border-border bg-muted"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imageUrl}
                  alt={`消息图片 ${index + 1}`}
                  className="h-20 w-20 object-cover"
                />
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  )
}
