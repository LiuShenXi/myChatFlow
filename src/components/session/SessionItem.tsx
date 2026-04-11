"use client"

import { useState } from "react"
import { Check, MessageSquare, Pencil, Trash2, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { ChatSession } from "@/types/chat"

interface SessionItemProps {
  session: ChatSession
  isActive: boolean
  onClick: () => void
  onDelete: () => void
  onRename: (title: string) => void
}

export function SessionItem({
  session,
  isActive,
  onClick,
  onDelete,
  onRename
}: SessionItemProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editTitle, setEditTitle] = useState(session.title)

  const handleRename = () => {
    const nextTitle = editTitle.trim()

    if (!nextTitle) {
      return
    }

    onRename(nextTitle)
    setIsEditing(false)
  }

  const handleCancel = () => {
    setEditTitle(session.title)
    setIsEditing(false)
  }

  return (
    <div
      role="button"
      tabIndex={0}
      className={`group flex items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors ${
        isActive
          ? "bg-accent text-accent-foreground"
          : "cursor-pointer hover:bg-accent/50"
      }`}
      onClick={isEditing ? undefined : onClick}
      onKeyDown={(event) => {
        if (!isEditing && (event.key === "Enter" || event.key === " ")) {
          event.preventDefault()
          onClick()
        }
      }}
    >
      <MessageSquare className="h-4 w-4 shrink-0" />

      {isEditing ? (
        <div className="flex flex-1 items-center gap-1">
          <Input
            value={editTitle}
            onChange={(event) => setEditTitle(event.target.value)}
            onClick={(event) => event.stopPropagation()}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault()
                handleRename()
              }

              if (event.key === "Escape") {
                event.preventDefault()
                handleCancel()
              }
            }}
            className="h-7 text-sm"
            aria-label="会话标题"
            autoFocus
          />
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            aria-label="确认重命名"
            onClick={(event) => {
              event.stopPropagation()
              handleRename()
            }}
          >
            <Check className="h-3 w-3" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            aria-label="取消重命名"
            onClick={(event) => {
              event.stopPropagation()
              handleCancel()
            }}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      ) : (
        <>
          <span className="flex-1 truncate text-sm">{session.title}</span>

          <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              aria-label="重命名会话"
              onClick={(event) => {
                event.stopPropagation()
                setEditTitle(session.title)
                setIsEditing(true)
              }}
            >
              <Pencil className="h-3 w-3" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              aria-label="删除会话"
              className="text-destructive"
              onClick={(event) => {
                event.stopPropagation()
                onDelete()
              }}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </>
      )}
    </div>
  )
}
