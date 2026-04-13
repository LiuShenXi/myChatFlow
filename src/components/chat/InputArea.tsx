"use client"

import type {
  ClipboardEvent,
  DragEvent,
  FormEvent,
  KeyboardEvent
} from "react"
import { forwardRef, useEffect, useRef } from "react"
import { ImagePlus, Send, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { useChatStore } from "@/store/chat-store"
import { useImageUpload } from "@/hooks/useImageUpload"

interface InputAreaProps {
  input: string
  setInput: (input: string) => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  disabled: boolean
  errorMessage?: string | null
}

export const InputArea = forwardRef<HTMLTextAreaElement, InputAreaProps>(
  function InputArea(
    {
      input,
      setInput,
      onSubmit,
      disabled,
      errorMessage
    },
    forwardedRef
  ) {
    const { images, removeImage, clearImages } = useChatStore()
    const { handleFiles } = useImageUpload()
    const textareaRef = useRef<HTMLTextAreaElement | null>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const setTextareaRef = (node: HTMLTextAreaElement | null) => {
      textareaRef.current = node

      if (typeof forwardedRef === "function") {
        forwardedRef(node)
        return
      }

      if (forwardedRef) {
        forwardedRef.current = node
      }
    }

    useEffect(() => {
      const textarea = textareaRef.current

      if (!textarea) {
        return
      }

      textarea.style.height = "auto"
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`
    }, [input])

    const handlePaste = async (event: ClipboardEvent<HTMLTextAreaElement>) => {
      const imageFiles = Array.from(event.clipboardData.items)
        .filter((item) => item.type.startsWith("image/"))
        .map((item) => item.getAsFile())
        .filter(Boolean) as File[]

      if (imageFiles.length > 0) {
        await handleFiles(imageFiles)
      }
    }

    const handleDrop = async (event: DragEvent<HTMLFormElement>) => {
      event.preventDefault()

      const files = Array.from(event.dataTransfer.files).filter((file) =>
        file.type.startsWith("image/")
      )

      if (files.length > 0) {
        await handleFiles(files)
      }
    }

    const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault()

        if (input.trim() && !disabled) {
          event.currentTarget.form?.requestSubmit()
        }
      }
    }

    const handleFormSubmit = (event: FormEvent<HTMLFormElement>) => {
      onSubmit(event)

      if (!event.defaultPrevented) {
        clearImages()
      }
    }

    return (
      <div className="border-t bg-background px-4 py-4">
        {errorMessage ? (
          <p className="mb-3 text-sm text-destructive">{errorMessage}</p>
        ) : null}

        {images.length > 0 ? (
          <div className="mb-3 flex flex-wrap gap-3">
            {images.map((image, index) => (
              <div
                key={`${image.slice(0, 32)}-${index}`}
                className="relative rounded-lg border bg-muted p-1"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={image}
                  alt={`上传图片 ${index + 1}`}
                  className="h-20 w-20 rounded-md object-cover"
                />
                <button
                  type="button"
                  className="absolute -right-2 -top-2 rounded-full bg-background p-1 shadow"
                  aria-label={`删除图片 ${index + 1}`}
                  onClick={() => removeImage(index)}
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        ) : null}

        <form
          className="flex items-end gap-2"
          onSubmit={handleFormSubmit}
          onDragOver={(event) => event.preventDefault()}
          onDrop={handleDrop}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(event) => {
              if (event.target.files) {
                void handleFiles(event.target.files)
              }
              event.target.value = ""
            }}
          />

          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="上传图片"
            onClick={() => fileInputRef.current?.click()}
          >
            <ImagePlus className="h-5 w-5" />
          </Button>

          <Textarea
            ref={setTextareaRef}
            value={input}
            rows={1}
            disabled={disabled}
            placeholder="输入消息... (Shift+Enter 换行)"
            className="max-h-[200px] min-h-[40px] flex-1 resize-none"
            onChange={(event) => setInput(event.target.value)}
            onPaste={(event) => {
              void handlePaste(event)
            }}
            onKeyDown={handleKeyDown}
          />

          <Button
            type="submit"
            size="icon"
            disabled={disabled || !input.trim()}
            aria-label="发送消息"
          >
            <Send className="h-5 w-5" />
          </Button>
        </form>
      </div>
    )
  }
)

InputArea.displayName = "InputArea"
