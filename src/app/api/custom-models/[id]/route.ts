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

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  const { id } = await params

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

  const [config] = await prisma.customModelConfig.updateManyAndReturn({
    where: {
      id,
      userId: session.user.id
    },
    data: {
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

  return NextResponse.json(config ?? null)
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  const { id } = await params

  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 })
  }

  await prisma.customModelConfig.deleteMany({
    where: {
      id,
      userId: session.user.id
    }
  })

  return NextResponse.json({ success: true })
}
