/** @jest-environment node */
const authMock = jest.fn()
const updateManyAndReturnMock = jest.fn()
const deleteManyMock = jest.fn()
const encryptMock = jest.fn()

jest.mock("@/lib/auth/next-auth", () => ({
  auth: (...args: unknown[]) => authMock(...args)
}))

jest.mock("@/lib/db/prisma", () => ({
  prisma: {
    customModelConfig: {
      updateManyAndReturn: (...args: unknown[]) => updateManyAndReturnMock(...args),
      deleteMany: (...args: unknown[]) => deleteManyMock(...args)
    }
  }
}))

jest.mock("@/lib/auth/encryption", () => ({
  encrypt: (...args: unknown[]) => encryptMock(...args)
}))

import { DELETE, PATCH } from "@/app/api/custom-models/[id]/route"

describe("/api/custom-models/[id] route", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("should update the current user's custom model", async () => {
    authMock.mockResolvedValue({ user: { id: "user-1" } })
    updateManyAndReturnMock.mockResolvedValue([
      {
        id: "cfg-1",
        name: "Updated Gateway",
        baseUrl: "https://new.example.com/v1",
        modelId: "gpt-4.1-mini",
        visionCapability: "vision",
        visionCapabilitySource: "manual",
        encryptedApiKey: "encrypted-key",
        updatedAt: "2026-04-12T00:00:00.000Z"
      }
    ])

    const response = await PATCH(
      new Request("http://localhost/api/custom-models/cfg-1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Updated Gateway",
          baseUrl: "https://new.example.com/v1",
          modelId: "gpt-4.1-mini"
        })
      }),
      {
        params: Promise.resolve({ id: "cfg-1" })
      }
    )

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual(
      expect.objectContaining({
        id: "cfg-1",
        name: "Updated Gateway",
        visionCapability: "vision",
        visionCapabilitySource: "manual"
      })
    )
    expect(updateManyAndReturnMock).toHaveBeenCalledWith({
      where: {
        id: "cfg-1",
        userId: "user-1"
      },
      data: {
        name: "Updated Gateway",
        baseUrl: "https://new.example.com/v1",
        modelId: "gpt-4.1-mini"
      },
      select: {
        id: true,
        name: true,
        baseUrl: true,
        modelId: true,
        visionCapability: true,
        visionCapabilitySource: true,
        encryptedApiKey: true,
        updatedAt: true
      }
    })
  })

  it("should mark vision capability as manual when explicitly updated", async () => {
    authMock.mockResolvedValue({ user: { id: "user-1" } })
    updateManyAndReturnMock.mockResolvedValue([
      {
        id: "cfg-1",
        name: "Updated Gateway",
        baseUrl: "https://new.example.com/v1",
        modelId: "gpt-4.1-mini",
        visionCapability: "text-only",
        visionCapabilitySource: "manual",
        encryptedApiKey: "encrypted-key",
        updatedAt: "2026-04-12T00:00:00.000Z"
      }
    ])

    const response = await PATCH(
      new Request("http://localhost/api/custom-models/cfg-1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Updated Gateway",
          baseUrl: "https://new.example.com/v1",
          modelId: "gpt-4.1-mini",
          visionCapability: "text-only"
        })
      }),
      {
        params: Promise.resolve({ id: "cfg-1" })
      }
    )

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual(
      expect.objectContaining({
        id: "cfg-1",
        visionCapability: "text-only",
        visionCapabilitySource: "manual"
      })
    )
    expect(updateManyAndReturnMock).toHaveBeenCalledWith({
      where: {
        id: "cfg-1",
        userId: "user-1"
      },
      data: {
        name: "Updated Gateway",
        baseUrl: "https://new.example.com/v1",
        modelId: "gpt-4.1-mini",
        visionCapability: "text-only",
        visionCapabilitySource: "manual"
      },
      select: {
        id: true,
        name: true,
        baseUrl: true,
        modelId: true,
        visionCapability: true,
        visionCapabilitySource: true,
        encryptedApiKey: true,
        updatedAt: true
      }
    })
  })

  it("should update the current user's custom model api key when provided", async () => {
    authMock.mockResolvedValue({ user: { id: "user-1" } })
    encryptMock.mockReturnValue("encrypted-new-key")
    updateManyAndReturnMock.mockResolvedValue([
      {
        id: "cfg-1",
        name: "Updated Gateway",
        baseUrl: "https://new.example.com/v1",
        modelId: "gpt-4.1-mini",
        visionCapability: "vision",
        visionCapabilitySource: "manual",
        encryptedApiKey: "encrypted-new-key",
        updatedAt: "2026-04-12T00:00:00.000Z"
      }
    ])

    await PATCH(
      new Request("http://localhost/api/custom-models/cfg-1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Updated Gateway",
          baseUrl: "https://new.example.com/v1",
          modelId: "gpt-4.1-mini",
          apiKey: "sk-new"
        })
      }),
      {
        params: Promise.resolve({ id: "cfg-1" })
      }
    )

    expect(updateManyAndReturnMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          name: "Updated Gateway",
          baseUrl: "https://new.example.com/v1",
          modelId: "gpt-4.1-mini",
          encryptedApiKey: "encrypted-new-key"
        }
      })
    )
  })

  it("should keep the old api key when patch payload omits apiKey", async () => {
    authMock.mockResolvedValue({ user: { id: "user-1" } })
    updateManyAndReturnMock.mockResolvedValue([
      {
        id: "cfg-1",
        name: "Updated Gateway",
        baseUrl: "https://new.example.com/v1",
        modelId: "gpt-4.1-mini",
        visionCapability: "unknown",
        visionCapabilitySource: "inferred",
        encryptedApiKey: "encrypted-key",
        updatedAt: "2026-04-12T00:00:00.000Z"
      }
    ])

    await PATCH(
      new Request("http://localhost/api/custom-models/cfg-1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Updated Gateway",
          baseUrl: "https://new.example.com/v1",
          modelId: "gpt-4.1-mini"
        })
      }),
      {
        params: Promise.resolve({ id: "cfg-1" })
      }
    )

    expect(updateManyAndReturnMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.not.objectContaining({
          encryptedApiKey: expect.anything()
        })
      })
    )
  })

  it("should delete the current user's custom model", async () => {
    authMock.mockResolvedValue({ user: { id: "user-1" } })

    const response = await DELETE(
      new Request("http://localhost/api/custom-models/cfg-1", {
        method: "DELETE"
      }),
      {
        params: Promise.resolve({ id: "cfg-1" })
      }
    )

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ success: true })
    expect(deleteManyMock).toHaveBeenCalledWith({
      where: {
        id: "cfg-1",
        userId: "user-1"
      }
    })
  })
})
