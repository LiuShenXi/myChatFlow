import { streamText } from "ai"
import { decrypt } from "@/lib/auth/encryption"
import { auth } from "@/lib/auth/next-auth"
import {
  createCustomOpenAICompatibleModel,
  getProvider
} from "@/lib/ai/providers"
import { createErrorResponse } from "@/lib/ai/stream-handler"
import { prisma } from "@/lib/db/prisma"
import { getModelConfig, parseCustomModelId } from "@/types/model"

type IncomingMessage = {
  role: "user" | "assistant" | "system"
  content: string
  images?: string[]
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

    const providerId = customModelConfig
      ? "custom-openai"
      : staticModelConfig!.provider

    const apiKeyRecord = await prisma.apiKey.findUnique({
      where: {
        userId_provider: {
          userId: session.user.id,
          provider: providerId
        }
      }
    })

    if (!apiKeyRecord) {
      return new Response(
        JSON.stringify({
          error: `请先在设置中配置 ${providerId} 的 API Key`
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
      !apiKeyRecord.endpointId?.trim()
    ) {
      return new Response(
        JSON.stringify({
          error: "请先在设置中配置豆包 endpoint-id"
        }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json"
          }
        }
      )
    }

    const apiKey = decrypt(apiKeyRecord.encryptedKey)
    const provider = customModelConfig
      ? createCustomOpenAICompatibleModel(
          customModelConfig.baseUrl,
          customModelConfig.modelId,
          apiKey
        )
      : getProvider(
          staticModelConfig!.provider,
          staticModelConfig!.provider === "doubao"
            ? apiKeyRecord.endpointId!.trim()
            : staticModelConfig!.modelId,
          apiKey
        )

    const result = await streamText({
      model: provider,
      messages: messages as never,
      onFinish: async ({ text, usage }) => {
        const lastUserMessage = messages[messages.length - 1]

        if (lastUserMessage?.role === "user") {
          await prisma.message.create({
            data: {
              sessionId,
              role: "user",
              content: lastUserMessage.content,
              images: lastUserMessage.images ?? []
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
