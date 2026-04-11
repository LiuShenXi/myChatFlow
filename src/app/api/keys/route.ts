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
      updatedAt: true
    }
  })

  return NextResponse.json(keys)
}

export async function POST(req: Request) {
  const session = await auth()

  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 })
  }

  const { provider, apiKey } = (await req.json()) as {
    provider: ModelProvider
    apiKey: string
  }

  const encryptedKey = encrypt(apiKey)

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
      encryptedKey
    },
    update: {
      encryptedKey
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
