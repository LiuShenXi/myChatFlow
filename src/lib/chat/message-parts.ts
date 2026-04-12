import type { Attachment, Message } from "ai"

type StoredMessage = {
  id: string
  role: Message["role"]
  content: string
  images?: string[]
}

function inferContentType(imageUrl: string) {
  const match = imageUrl.match(/^data:(image\/[a-z0-9.+-]+);base64,/i)

  return match?.[1] ?? "image/png"
}

export function buildImageAttachments(images: string[]): Attachment[] {
  return images.map((url, index) => ({
    name: `image-${index + 1}`,
    contentType: inferContentType(url),
    url
  }))
}

export function extractImageUrls(attachments?: Attachment[]) {
  return (attachments ?? [])
    .filter((attachment) => attachment.contentType?.startsWith("image/"))
    .map((attachment) => attachment.url)
}

export function mapStoredMessageToUiMessage(message: StoredMessage): Message {
  const uiMessage: Message = {
    id: message.id,
    role: message.role,
    content: message.content
  }

  if (message.images?.length) {
    uiMessage.experimental_attachments = buildImageAttachments(message.images)
  }

  return uiMessage
}

export function sanitizeMessagesForModelInput<T extends Message>(messages: T[]): T[] {
  return messages.map((message) => {
    if (message.role !== "assistant" || !message.parts?.length) {
      return message
    }

    const filteredParts = message.parts.filter((part) => part.type !== "step-start")

    if (filteredParts.length === message.parts.length) {
      return message
    }

    if (filteredParts.length === 0) {
      const { parts: _parts, ...messageWithoutParts } = message
      return messageWithoutParts as T
    }

    return {
      ...message,
      parts: filteredParts
    }
  })
}
