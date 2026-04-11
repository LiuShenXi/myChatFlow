/** @jest-environment node */
const authMock = jest.fn()
const findFirstMock = jest.fn()
const updateManyMock = jest.fn()
const deleteManyMock = jest.fn()

jest.mock("@/lib/auth/next-auth", () => ({
  auth: (...args: unknown[]) => authMock(...args)
}))

jest.mock("@/lib/db/prisma", () => ({
  prisma: {
    chatSession: {
      findFirst: (...args: unknown[]) => findFirstMock(...args),
      updateMany: (...args: unknown[]) => updateManyMock(...args),
      deleteMany: (...args: unknown[]) => deleteManyMock(...args)
    }
  }
}))

import {
  DELETE,
  GET,
  PATCH
} from "@/app/api/sessions/[id]/route"

describe("/api/sessions/[id] route", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("should return 404 when the session is missing", async () => {
    authMock.mockResolvedValue({ user: { id: "user-1" } })
    findFirstMock.mockResolvedValue(null)

    const response = await GET(new Request("http://localhost"), {
      params: Promise.resolve({ id: "session-1" })
    })

    expect(response.status).toBe(404)
  })

  it("should return a session with messages for the owner", async () => {
    const session = {
      id: "session-1",
      userId: "user-1",
      title: "新对话",
      model: "gpt-4",
      messages: [{ id: "message-1", content: "hello" }]
    }

    authMock.mockResolvedValue({ user: { id: "user-1" } })
    findFirstMock.mockResolvedValue(session)

    const response = await GET(new Request("http://localhost"), {
      params: Promise.resolve({ id: "session-1" })
    })

    await expect(response.json()).resolves.toEqual(session)
    expect(findFirstMock).toHaveBeenCalledWith({
      where: {
        id: "session-1",
        userId: "user-1"
      },
      include: {
        messages: {
          orderBy: { createdAt: "asc" }
        }
      }
    })
  })

  it("should rename a session owned by the current user", async () => {
    authMock.mockResolvedValue({ user: { id: "user-1" } })
    updateManyMock.mockResolvedValue({ count: 1 })

    const response = await PATCH(
      new Request("http://localhost", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ title: "已重命名" })
      }),
      {
        params: Promise.resolve({ id: "session-1" })
      }
    )

    await expect(response.json()).resolves.toEqual({ success: true })
    expect(updateManyMock).toHaveBeenCalledWith({
      where: {
        id: "session-1",
        userId: "user-1"
      },
      data: { title: "已重命名" }
    })
  })

  it("should delete a session owned by the current user", async () => {
    authMock.mockResolvedValue({ user: { id: "user-1" } })
    deleteManyMock.mockResolvedValue({ count: 1 })

    const response = await DELETE(new Request("http://localhost"), {
      params: Promise.resolve({ id: "session-1" })
    })

    await expect(response.json()).resolves.toEqual({ success: true })
    expect(deleteManyMock).toHaveBeenCalledWith({
      where: {
        id: "session-1",
        userId: "user-1"
      }
    })
  })
})
