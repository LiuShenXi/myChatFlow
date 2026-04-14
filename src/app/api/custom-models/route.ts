import { NextResponse } from "next/server"
import { encrypt } from "@/lib/auth/encryption"
import { auth } from "@/lib/auth/next-auth"
import { prisma } from "@/lib/db/prisma"

function isValidBaseUrl(baseUrl: string) {
  try {
    const url = new URL(baseUrl)

    return url.protocol === "http:" || url.protocol === "https:"
  } catch {
    return false
  }
}

function createInvalidConfigResponse() {
  return NextResponse.json(
    {
      error: "自定义模型配置不合法"
    },
    {
      status: 400
    }
  )
}

function toPublicConfig(config: {
  id: string
  name: string
  baseUrl: string
  modelId: string
  visionCapability: string
  visionCapabilitySource: string
  encryptedApiKey: string | null
  updatedAt: string | Date
}) {
  return {
    id: config.id,
    name: config.name,
    baseUrl: config.baseUrl,
    modelId: config.modelId,
    visionCapability: config.visionCapability,
    visionCapabilitySource: config.visionCapabilitySource,
    hasApiKey: Boolean(config.encryptedApiKey),
    updatedAt: config.updatedAt
  }
}

export async function GET() {
  const session = await auth()

  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 })
  }

  const configs = await prisma.customModelConfig.findMany({
    where: {
      userId: session.user.id
    },
    orderBy: {
      updatedAt: "desc"
    },
    select: {
      id: true,
      name: true,
      baseUrl: true,
      modelId: true,
      visionCapability: true,
      visionCapabilitySource: true,
      encryptedApiKey: true,
      updatedAt: true
    }
  })

  return NextResponse.json(configs.map(toPublicConfig))
}

export async function POST(req: Request) {
  const session = await auth()

  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 })
  }

  const payload = (await req.json()) as {
    name?: string
    baseUrl?: string
    modelId?: string
    visionCapability?: string
    apiKey?: string
  }

  const name = payload.name?.trim()
  const baseUrl = payload.baseUrl?.trim()
  const modelId = payload.modelId?.trim()
  const apiKey = payload.apiKey?.trim()

  if (!name || !modelId || !baseUrl || !apiKey || !isValidBaseUrl(baseUrl)) {
    return createInvalidConfigResponse()
  }

  const config = await prisma.customModelConfig.create({
    data: {
      userId: session.user.id,
      name,
      baseUrl,
      modelId,
      visionCapability: payload.visionCapability?.trim() || "unknown",
      visionCapabilitySource: payload.visionCapability?.trim() ? "manual" : "inferred",
      encryptedApiKey: encrypt(apiKey)
    },
    select: {
      id: true,
      name: true,
      baseUrl: true,
      modelId: true,
      visionCapability: true,
      visionCapabilitySource: true,
      encryptedApiKey: true,
      updatedAt: true
    }
  })

  return NextResponse.json(toPublicConfig(config))
}
