import { NextResponse } from "next/server"
import { auth } from "@/lib/auth/next-auth"
import { prisma } from "@/lib/db/prisma"

type RouteContext = {
  params: Promise<{ id: string }>
}

export async function GET(_req: Request, { params }: RouteContext) {
  const session = await auth()

  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 })
  }

  const { id } = await params

  const chatSession = await prisma.chatSession.findFirst({
    where: {
      id,
      userId: session.user.id
    },
    include: {
      messages: {
        orderBy: { createdAt: "asc" }
      }
    }
  })

  if (!chatSession) {
    return new Response("Not found", { status: 404 })
  }

  return NextResponse.json(chatSession)
}

export async function PATCH(req: Request, { params }: RouteContext) {
  const session = await auth()

  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 })
  }

  const { id } = await params
  const { title } = await req.json()

  const result = await prisma.chatSession.updateMany({
    where: {
      id,
      userId: session.user.id
    },
    data: {
      title
    }
  })

  if (result.count === 0) {
    return new Response("Not found", { status: 404 })
  }

  return NextResponse.json({ success: true })
}

export async function DELETE(_req: Request, { params }: RouteContext) {
  const session = await auth()

  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 })
  }

  const { id } = await params

  await prisma.chatSession.deleteMany({
    where: {
      id,
      userId: session.user.id
    }
  })

  return NextResponse.json({ success: true })
}
