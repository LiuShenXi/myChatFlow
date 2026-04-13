import type { Attachment, Message } from "ai"

type StoredMessage = {
  id: string
  role: "user" | "assistant" | "system"
  content: string
  images?: string[]
}

export function buildImageAttachments(images: string[]): Attachment[] {
  return images.map((url, index) => ({
    name: `image-${index + 1}`,
    contentType: url.match(/^data:(.*?);base64,/)?.[1] ?? "image/jpeg",
    url
  }))
}

export function extractImageUrls(attachments?: Attachment[]): string[] {
  return (attachments ?? [])
    .filter((attachment) => attachment.contentType?.startsWith("image/"))
    .map((attachment) => attachment.url)
}

export function mapStoredMessageToUiMessage(message: StoredMessage): Message {
  const imageAttachments = buildImageAttachments(message.images ?? [])

  return {
    id: message.id,
    role: message.role,
    content: message.content,
    ...(imageAttachments.length > 0
      ? {
          experimental_attachments: imageAttachments
        }
      : {})
  }
}
