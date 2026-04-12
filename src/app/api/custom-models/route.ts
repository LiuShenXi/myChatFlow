import { NextResponse } from "next/server"
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
      updatedAt: true
    }
  })

  return NextResponse.json(configs)
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
  }

  const name = payload.name?.trim()
  const baseUrl = payload.baseUrl?.trim()
  const modelId = payload.modelId?.trim()

  if (!name || !modelId || !baseUrl || !isValidBaseUrl(baseUrl)) {
    return createInvalidConfigResponse()
  }

  const config = await prisma.customModelConfig.create({
    data: {
      userId: session.user.id,
      name,
      baseUrl,
      modelId
    },
    select: {
      id: true,
      name: true,
      baseUrl: true,
      modelId: true,
      updatedAt: true
    }
  })

  return NextResponse.json(config)
}
