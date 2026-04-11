import { NextResponse } from "next/server"
import { auth } from "@/lib/auth/next-auth"
import { prisma } from "@/lib/db/prisma"

export async function GET() {
  const session = await auth()

  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 })
  }

  const chatSessions = await prisma.chatSession.findMany({
    where: { userId: session.user.id },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      title: true,
      model: true,
      createdAt: true,
      updatedAt: true
    }
  })

  return NextResponse.json(chatSessions)
}

export async function POST(req: Request) {
  const session = await auth()

  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 })
  }

  const { model } = await req.json()

  const chatSession = await prisma.chatSession.create({
    data: {
      userId: session.user.id,
      model: model || "gpt-4"
    }
  })

  return NextResponse.json(chatSession)
}
