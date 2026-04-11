export interface ChatMessage {
  id: string
  role: "user" | "assistant" | "system"
  content: string
  images?: string[]
  tokenCount?: number
  createdAt: Date
}

export interface ChatSession {
  id: string
  title: string
  model: string
  createdAt: Date
  updatedAt: Date
}
