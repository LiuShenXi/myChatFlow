import { NextResponse } from "next/server"
import { encrypt } from "@/lib/auth/encryption"
import { auth } from "@/lib/auth/next-auth"
import { prisma } from "@/lib/db/prisma"
import type { ModelProvider } from "@/lib/ai/providers"

export async function GET() {
  const session = await auth()

  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 })
  }

  const keys = await prisma.apiKey.findMany({
    where: {
      userId: session.user.id
    },
    select: {
      provider: true,
      updatedAt: true,
      endpointId: true
    }
  })

  return NextResponse.json(keys)
}

export async function POST(req: Request) {
  const session = await auth()

  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 })
  }

  const { provider, apiKey, endpointId } = (await req.json()) as {
    provider: ModelProvider
    apiKey: string
    endpointId?: string
  }

  if (provider === "doubao" && !endpointId?.trim()) {
    return NextResponse.json(
      {
        error: "请先填写豆包 endpoint-id"
      },
      {
        status: 400
      }
    )
  }

  const encryptedKey = encrypt(apiKey)
  const normalizedEndpointId =
    provider === "doubao" ? endpointId?.trim() ?? null : null

  await prisma.apiKey.upsert({
    where: {
      userId_provider: {
        userId: session.user.id,
        provider
      }
    },
    create: {
      userId: session.user.id,
      provider,
      encryptedKey,
      endpointId: normalizedEndpointId
    },
    update: {
      encryptedKey,
      endpointId: normalizedEndpointId
    }
  })

  return NextResponse.json({ success: true })
}

export async function DELETE(req: Request) {
  const session = await auth()

  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 })
  }

  const { provider } = (await req.json()) as {
    provider: ModelProvider
  }

  await prisma.apiKey.deleteMany({
    where: {
      userId: session.user.id,
      provider
    }
  })

  return NextResponse.json({ success: true })
}
