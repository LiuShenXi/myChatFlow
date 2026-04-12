import { streamText, type Attachment, type Message } from "ai"
import { decrypt } from "@/lib/auth/encryption"
import { auth } from "@/lib/auth/next-auth"
import {
  createCustomOpenAICompatibleModel,
  getProvider
} from "@/lib/ai/providers"
import { createErrorResponse } from "@/lib/ai/stream-handler"
import {
  extractImageUrls,
  sanitizeMessagesForModelInput
} from "@/lib/chat/message-parts"
import { prisma } from "@/lib/db/prisma"
import {
  getModelConfig,
  modelSupportsImageInput,
  parseCustomModelId
} from "@/types/model"

type IncomingMessage = Message & {
  experimental_attachments?: Attachment[]
}

export async function POST(req: Request) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return new Response("Unauthorized", { status: 401 })
    }

    const {
      messages,
      model: modelId,
      sessionId
    }: {
      messages: IncomingMessage[]
      model: string
      sessionId: string
    } = await req.json()

    const staticModelConfig = getModelConfig(modelId)
    const customModelId = parseCustomModelId(modelId)

    if (!staticModelConfig && !customModelId) {
      return new Response("Invalid model", { status: 400 })
    }

    const customModelConfig = customModelId
      ? await prisma.customModelConfig.findUnique({
          where: {
            id: customModelId
          }
        })
      : null

    if (
      customModelId &&
      (!customModelConfig || customModelConfig.userId !== session.user.id)
    ) {
      return new Response("Invalid model", { status: 400 })
    }

    const customEncryptedApiKey = customModelConfig?.encryptedApiKey ?? null

    if (customModelConfig && !customEncryptedApiKey?.trim()) {
      return new Response(
        JSON.stringify({
          error: "\u8be5\u81ea\u5b9a\u4e49\u6a21\u578b\u7f3a\u5c11 API Key\uff0c\u8bf7\u5728\u8bbe\u7f6e\u4e2d\u91cd\u65b0\u4fdd\u5b58"
        }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json"
          }
        }
      )
    }

    const apiKeyRecord = customModelConfig
      ? null
      : await prisma.apiKey.findUnique({
          where: {
            userId_provider: {
              userId: session.user.id,
              provider: staticModelConfig!.provider
            }
          }
        })

    if (!customModelConfig && !apiKeyRecord) {
      return new Response(
        JSON.stringify({
          error: `\u8bf7\u5148\u5728\u8bbe\u7f6e\u4e2d\u914d\u7f6e ${staticModelConfig!.provider} \u7684 API Key`
        }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json"
          }
        }
      )
    }

    if (
      staticModelConfig?.provider === "doubao" &&
      !apiKeyRecord?.endpointId?.trim()
    ) {
      return new Response(
        JSON.stringify({
          error: "\u8bf7\u5148\u5728\u8bbe\u7f6e\u4e2d\u914d\u7f6e\u8c46\u5305 endpoint-id"
        }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json"
          }
        }
      )
    }

    const lastUserMessage = [...messages].reverse().find((message) => {
      return message.role === "user"
    })
    const lastUserImages = extractImageUrls(
      lastUserMessage?.experimental_attachments
    )
    const hasAnyUserImages = messages.some((message) => {
      return (
        message.role === "user" &&
        extractImageUrls(message.experimental_attachments).length > 0
      )
    })

    if (hasAnyUserImages && !modelSupportsImageInput(modelId)) {
      return new Response(
        JSON.stringify({
          error: "\u5f53\u524d\u6a21\u578b\u4e0d\u652f\u6301\u56fe\u7247\u8f93\u5165\uff0c\u8bf7\u5207\u6362\u5230\u652f\u6301\u591a\u6a21\u6001\u7684\u6a21\u578b\u540e\u518d\u53d1\u9001"
        }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json"
          }
        }
      )
    }

    const apiKey = customModelConfig
      ? decrypt(customEncryptedApiKey!)
      : decrypt(apiKeyRecord!.encryptedKey)
    const resolvedModelId =
      staticModelConfig?.provider === "doubao"
        ? apiKeyRecord?.endpointId?.trim()
        : staticModelConfig?.modelId
    const provider = customModelConfig
      ? createCustomOpenAICompatibleModel(
          customModelConfig.baseUrl,
          customModelConfig.modelId,
          apiKey
        )
      : getProvider(
          staticModelConfig!.provider,
          resolvedModelId!,
          apiKey
        )
    const modelMessages = sanitizeMessagesForModelInput(messages)

    const result = await streamText({
      model: provider,
      messages: modelMessages as never,
      onFinish: async ({ text, usage }) => {
        if (lastUserMessage?.role === "user") {
          await prisma.message.create({
            data: {
              sessionId,
              role: "user",
              content: lastUserMessage.content,
              images: lastUserImages
            }
          })
        }

        await prisma.message.create({
          data: {
            sessionId,
            role: "assistant",
            content: text,
            tokenCount: usage.totalTokens
          }
        })

        await prisma.chatSession.update({
          where: { id: sessionId },
          data: {
            updatedAt: new Date()
          }
        })
      }
    })

    return result.toDataStreamResponse()
  } catch (error) {
    return createErrorResponse(error)
  }
}
