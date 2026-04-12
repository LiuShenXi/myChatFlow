/** @jest-environment node */
const authMock = jest.fn()
const findManyMock = jest.fn()
const createMock = jest.fn()

jest.mock("@/lib/auth/next-auth", () => ({
  auth: (...args: unknown[]) => authMock(...args)
}))

jest.mock("@/lib/db/prisma", () => ({
  prisma: {
    customModelConfig: {
      findMany: (...args: unknown[]) => findManyMock(...args),
      create: (...args: unknown[]) => createMock(...args)
    }
  }
}))

import { GET, POST } from "@/app/api/custom-models/route"

describe("/api/custom-models route", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("should reject unauthenticated custom model list requests", async () => {
    authMock.mockResolvedValue(null)

    const response = await GET()

    expect(response.status).toBe(401)
  })

  it("should return the current user's custom models", async () => {
    authMock.mockResolvedValue({ user: { id: "user-1" } })
    findManyMock.mockResolvedValue([
      {
        id: "cfg-1",
        name: "My Gateway",
        baseUrl: "https://example.com/v1",
        modelId: "gpt-4o-mini",
        updatedAt: "2026-04-12T00:00:00.000Z"
      }
    ])

    const response = await GET()

    await expect(response.json()).resolves.toEqual([
      expect.objectContaining({ id: "cfg-1", name: "My Gateway" })
    ])
    expect(findManyMock).toHaveBeenCalledWith({
      where: { userId: "user-1" },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        name: true,
        baseUrl: true,
        modelId: true,
        updatedAt: true
      }
    })
  })

  it("should reject invalid base urls when creating a custom model", async () => {
    authMock.mockResolvedValue({ user: { id: "user-1" } })

    const response = await POST(
      new Request("http://localhost/api/custom-models", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "My Gateway",
          baseUrl: "not-a-url",
          modelId: "gpt-4o-mini"
        })
      })
    )

    expect(response.status).toBe(400)
  })

  it("should create a custom model for the current user", async () => {
    authMock.mockResolvedValue({ user: { id: "user-1" } })
    createMock.mockResolvedValue({
      id: "cfg-1",
      userId: "user-1",
      name: "My Gateway",
      baseUrl: "https://example.com/v1",
      modelId: "gpt-4o-mini",
      updatedAt: "2026-04-12T00:00:00.000Z"
    })

    const response = await POST(
      new Request("http://localhost/api/custom-models", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "My Gateway",
          baseUrl: "https://example.com/v1",
          modelId: "gpt-4o-mini"
        })
      })
    )

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual(
      expect.objectContaining({
        id: "cfg-1",
        name: "My Gateway"
      })
    )
    expect(createMock).toHaveBeenCalledWith({
      data: {
        userId: "user-1",
        name: "My Gateway",
        baseUrl: "https://example.com/v1",
        modelId: "gpt-4o-mini"
      },
      select: {
        id: true,
        name: true,
        baseUrl: true,
        modelId: true,
        updatedAt: true
      }
    })
  })
})
