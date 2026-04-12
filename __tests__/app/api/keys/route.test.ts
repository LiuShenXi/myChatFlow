/** @jest-environment node */
const authMock = jest.fn()
const findManyMock = jest.fn()
const upsertMock = jest.fn()
const deleteManyMock = jest.fn()
const encryptMock = jest.fn()

jest.mock("@/lib/auth/next-auth", () => ({
  auth: (...args: unknown[]) => authMock(...args)
}))

jest.mock("@/lib/db/prisma", () => ({
  prisma: {
    apiKey: {
      findMany: (...args: unknown[]) => findManyMock(...args),
      upsert: (...args: unknown[]) => upsertMock(...args),
      deleteMany: (...args: unknown[]) => deleteManyMock(...args)
    }
  }
}))

jest.mock("@/lib/auth/encryption", () => ({
  encrypt: (...args: unknown[]) => encryptMock(...args)
}))

import { DELETE, GET, POST } from "@/app/api/keys/route"

describe("/api/keys route", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("should reject unauthenticated key listing requests", async () => {
    authMock.mockResolvedValue(null)

    const response = await GET()

    expect(response.status).toBe(401)
  })

  it("should return saved providers for the current user", async () => {
    const keys = [
      {
        provider: "openai",
        updatedAt: "2026-04-12T00:00:00.000Z",
        endpointId: null
      }
    ]

    authMock.mockResolvedValue({ user: { id: "user-1" } })
    findManyMock.mockResolvedValue(keys)

    const response = await GET()

    await expect(response.json()).resolves.toEqual(keys)
    expect(findManyMock).toHaveBeenCalledWith({
      where: { userId: "user-1" },
      select: {
        provider: true,
        updatedAt: true,
        endpointId: true
      }
    })
  })

  it("should include doubao endpoint id in the key list", async () => {
    authMock.mockResolvedValue({ user: { id: "user-1" } })
    findManyMock.mockResolvedValue([
      {
        provider: "doubao",
        updatedAt: "2026-04-12T00:00:00.000Z",
        endpointId: "ep-20260412"
      }
    ])

    const response = await GET()

    await expect(response.json()).resolves.toEqual([
      {
        provider: "doubao",
        updatedAt: "2026-04-12T00:00:00.000Z",
        endpointId: "ep-20260412"
      }
    ])
  })

  it("should upsert an encrypted api key", async () => {
    authMock.mockResolvedValue({ user: { id: "user-1" } })
    encryptMock.mockReturnValue("encrypted-key")

    const response = await POST(
      new Request("http://localhost/api/keys", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          provider: "openai",
          apiKey: "sk-test"
        })
      })
    )

    await expect(response.json()).resolves.toEqual({ success: true })
    expect(encryptMock).toHaveBeenCalledWith("sk-test")
    expect(upsertMock).toHaveBeenCalledWith({
      where: {
        userId_provider: {
          userId: "user-1",
          provider: "openai"
        }
      },
      create: {
        userId: "user-1",
        provider: "openai",
        encryptedKey: "encrypted-key",
        endpointId: null
      },
      update: {
        encryptedKey: "encrypted-key",
        endpointId: null
      }
    })
  })

  it("should reject saving doubao keys without an endpoint id", async () => {
    authMock.mockResolvedValue({ user: { id: "user-1" } })

    const response = await POST(
      new Request("http://localhost/api/keys", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          provider: "doubao",
          apiKey: "doubao-key"
        })
      })
    )

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({
      error: "请先填写豆包 endpoint-id"
    })
  })

  it("should save doubao keys together with endpoint id", async () => {
    authMock.mockResolvedValue({ user: { id: "user-1" } })
    encryptMock.mockReturnValue("encrypted-key")

    const response = await POST(
      new Request("http://localhost/api/keys", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          provider: "doubao",
          apiKey: "doubao-key",
          endpointId: "ep-20260412"
        })
      })
    )

    await expect(response.json()).resolves.toEqual({ success: true })
    expect(upsertMock).toHaveBeenCalledWith({
      where: {
        userId_provider: {
          userId: "user-1",
          provider: "doubao"
        }
      },
      create: {
        userId: "user-1",
        provider: "doubao",
        encryptedKey: "encrypted-key",
        endpointId: "ep-20260412"
      },
      update: {
        encryptedKey: "encrypted-key",
        endpointId: "ep-20260412"
      }
    })
  })

  it("should save a custom-openai api key like other compatible providers", async () => {
    authMock.mockResolvedValue({ user: { id: "user-1" } })
    encryptMock.mockReturnValue("encrypted-key")

    const response = await POST(
      new Request("http://localhost/api/keys", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          provider: "custom-openai",
          apiKey: "sk-custom-test"
        })
      })
    )

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ success: true })
    expect(upsertMock).toHaveBeenCalledWith({
      where: {
        userId_provider: {
          userId: "user-1",
          provider: "custom-openai"
        }
      },
      create: {
        userId: "user-1",
        provider: "custom-openai",
        encryptedKey: "encrypted-key",
        endpointId: null
      },
      update: {
        encryptedKey: "encrypted-key",
        endpointId: null
      }
    })
  })

  it("should delete a saved provider key", async () => {
    authMock.mockResolvedValue({ user: { id: "user-1" } })

    const response = await DELETE(
      new Request("http://localhost/api/keys", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          provider: "openai"
        })
      })
    )

    await expect(response.json()).resolves.toEqual({ success: true })
    expect(deleteManyMock).toHaveBeenCalledWith({
      where: {
        userId: "user-1",
        provider: "openai"
      }
    })
  })
})
