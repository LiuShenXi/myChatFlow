/** @jest-environment node */
const authMock = jest.fn()
const findManyMock = jest.fn()
const createMock = jest.fn()

jest.mock("@/lib/auth/next-auth", () => ({
  auth: (...args: unknown[]) => authMock(...args)
}))

jest.mock("@/lib/db/prisma", () => ({
  prisma: {
    chatSession: {
      findMany: (...args: unknown[]) => findManyMock(...args),
      create: (...args: unknown[]) => createMock(...args)
    }
  }
}))

import { GET, POST } from "@/app/api/sessions/route"

describe("/api/sessions route", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("should reject unauthenticated list requests", async () => {
    authMock.mockResolvedValue(null)

    const response = await GET()

    expect(response.status).toBe(401)
  })

  it("should return the current user's sessions", async () => {
    const sessions = [
      {
        id: "session-1",
        title: "新对话",
        model: "gpt-4",
        createdAt: "2026-04-12T00:00:00.000Z",
        updatedAt: "2026-04-12T00:00:00.000Z"
      }
    ]

    authMock.mockResolvedValue({ user: { id: "user-1" } })
    findManyMock.mockResolvedValue(sessions)

    const response = await GET()

    await expect(response.json()).resolves.toEqual(sessions)
    expect(findManyMock).toHaveBeenCalledWith({
      where: { userId: "user-1" },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        title: true,
        model: true,
        createdAt: true,
        updatedAt: true
      }
    })
  })

  it("should create a session for the current user", async () => {
    const session = {
      id: "session-1",
      userId: "user-1",
      title: "新对话",
      model: "gpt-4o"
    }

    authMock.mockResolvedValue({ user: { id: "user-1" } })
    createMock.mockResolvedValue(session)

    const request = new Request("http://localhost/api/sessions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ model: "gpt-4o" })
    })

    const response = await POST(request)

    await expect(response.json()).resolves.toEqual(session)
    expect(createMock).toHaveBeenCalledWith({
      data: {
        userId: "user-1",
        model: "gpt-4o"
      }
    })
  })
})
