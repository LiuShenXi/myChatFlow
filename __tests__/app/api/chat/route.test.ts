/** @jest-environment node */
const authMock = jest.fn()
const findUniqueMock = jest.fn()
const customModelFindUniqueMock = jest.fn()
const messageCreateMock = jest.fn()
const sessionUpdateMock = jest.fn()
const decryptMock = jest.fn()
const getProviderMock = jest.fn()
const createCustomProviderMock = jest.fn()
const streamTextMock = jest.fn()

jest.mock("ai", () => ({
  streamText: (...args: unknown[]) => streamTextMock(...args)
}))

jest.mock("@/lib/auth/next-auth", () => ({
  auth: (...args: unknown[]) => authMock(...args)
}))

jest.mock("@/lib/db/prisma", () => ({
  prisma: {
    apiKey: {
      findUnique: (...args: unknown[]) => findUniqueMock(...args)
    },
    customModelConfig: {
      findUnique: (...args: unknown[]) => customModelFindUniqueMock(...args)
    },
    message: {
      create: (...args: unknown[]) => messageCreateMock(...args)
    },
    chatSession: {
      update: (...args: unknown[]) => sessionUpdateMock(...args)
    }
  }
}))

jest.mock("@/lib/auth/encryption", () => ({
  decrypt: (...args: unknown[]) => decryptMock(...args)
}))

jest.mock("@/lib/ai/providers", () => ({
  getProvider: (...args: unknown[]) => getProviderMock(...args),
  createCustomOpenAICompatibleModel: (...args: unknown[]) =>
    createCustomProviderMock(...args)
}))

import { POST } from "@/app/api/chat/route"

describe("/api/chat route", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("should reject unauthenticated chat requests", async () => {
    authMock.mockResolvedValue(null)

    const response = await POST(
      new Request("http://localhost/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          messages: [],
          model: "gpt-4",
          sessionId: "session-1"
        })
      })
    )

    expect(response.status).toBe(401)
  })

  it("should reject invalid models", async () => {
    authMock.mockResolvedValue({ user: { id: "user-1" } })

    const response = await POST(
      new Request("http://localhost/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          messages: [],
          model: "not-a-real-model",
          sessionId: "session-1"
        })
      })
    )

    expect(response.status).toBe(400)
  })

  it("should reject requests when the provider key is missing", async () => {
    authMock.mockResolvedValue({ user: { id: "user-1" } })
    findUniqueMock.mockResolvedValue(null)

    const response = await POST(
      new Request("http://localhost/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          messages: [],
          model: "gpt-4",
          sessionId: "session-1"
        })
      })
    )

    await expect(response.json()).resolves.toEqual({
      error: "请先在设置中配置 openai 的 API Key"
    })
    expect(response.status).toBe(400)
  })

  it("should stream a response and persist messages on finish", async () => {
    authMock.mockResolvedValue({ user: { id: "user-1" } })
    findUniqueMock.mockResolvedValue({ encryptedKey: "encrypted-value" })
    decryptMock.mockReturnValue("decrypted-value")
    getProviderMock.mockReturnValue({ provider: "openai-model" })
    streamTextMock.mockImplementation(async ({ onFinish }) => {
      await onFinish({
        text: "助手回复",
        usage: {
          totalTokens: 42
        }
      })

      return {
        toDataStreamResponse: () => new Response("stream-ok", { status: 200 })
      }
    })

    const response = await POST(
      new Request("http://localhost/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          sessionId: "session-1",
          model: "gpt-4",
          messages: [
            {
              role: "user",
              content: "你好",
              images: []
            }
          ]
        })
      })
    )

    expect(response.status).toBe(200)
    expect(decryptMock).toHaveBeenCalledWith("encrypted-value")
    expect(getProviderMock).toHaveBeenCalledWith(
      "openai",
      "gpt-4",
      "decrypted-value"
    )
    expect(messageCreateMock).toHaveBeenCalledTimes(2)
    expect(sessionUpdateMock).toHaveBeenCalledWith({
      where: { id: "session-1" },
      data: { updatedAt: expect.any(Date) }
    })
  })

  it("should use the qwen provider when the selected model is qwen-plus", async () => {
    authMock.mockResolvedValue({ user: { id: "user-1" } })
    findUniqueMock.mockResolvedValue({ encryptedKey: "encrypted-value" })
    decryptMock.mockReturnValue("decrypted-value")
    getProviderMock.mockReturnValue({ provider: "qwen-model" })
    streamTextMock.mockImplementation(async () => ({
      toDataStreamResponse: () => new Response("stream-ok", { status: 200 })
    }))

    const response = await POST(
      new Request("http://localhost/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          sessionId: "session-1",
          model: "qwen-plus",
          messages: [
            {
              role: "user",
              content: "你好"
            }
          ]
        })
      })
    )

    expect(response.status).toBe(200)
    expect(getProviderMock).toHaveBeenCalledWith(
      "qwen",
      "qwen-plus",
      "decrypted-value"
    )
  })

  it("should reject doubao chat requests when endpoint id is missing", async () => {
    authMock.mockResolvedValue({ user: { id: "user-1" } })
    findUniqueMock.mockResolvedValue({
      encryptedKey: "encrypted-value",
      endpointId: null
    })

    const response = await POST(
      new Request("http://localhost/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          sessionId: "session-1",
          model: "doubao-seed-1-6",
          messages: [
            {
              role: "user",
              content: "你好"
            }
          ]
        })
      })
    )

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({
      error: "请先在设置中配置豆包 endpoint-id"
    })
  })

  it("should use doubao endpoint id instead of the static model id", async () => {
    authMock.mockResolvedValue({ user: { id: "user-1" } })
    findUniqueMock.mockResolvedValue({
      encryptedKey: "encrypted-value",
      endpointId: "ep-20260412"
    })
    decryptMock.mockReturnValue("decrypted-value")
    getProviderMock.mockReturnValue({ provider: "doubao-model" })
    streamTextMock.mockResolvedValue({
      toDataStreamResponse: () => new Response("stream-ok", { status: 200 })
    })

    const response = await POST(
      new Request("http://localhost/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          sessionId: "session-1",
          model: "doubao-seed-1-6",
          messages: [
            {
              role: "user",
              content: "你好"
            }
          ]
        })
      })
    )

    expect(response.status).toBe(200)
    expect(getProviderMock).toHaveBeenCalledWith(
      "doubao",
      "ep-20260412",
      "decrypted-value"
    )
  })

  it("should use a custom model config when the current model is custom:<id>", async () => {
    authMock.mockResolvedValue({ user: { id: "user-1" } })
    findUniqueMock.mockResolvedValue({
      encryptedKey: "encrypted-custom-key"
    })
    customModelFindUniqueMock.mockResolvedValue({
      id: "cfg-1",
      userId: "user-1",
      name: "My Gateway",
      baseUrl: "https://example.com/v1",
      modelId: "gpt-4o-mini"
    })
    decryptMock.mockReturnValue("decrypted-custom-key")
    createCustomProviderMock.mockReturnValue({ provider: "custom-model" })
    streamTextMock.mockResolvedValue({
      toDataStreamResponse: () => new Response("stream-ok", { status: 200 })
    })

    const response = await POST(
      new Request("http://localhost/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          sessionId: "session-1",
          model: "custom:cfg-1",
          messages: [{ role: "user", content: "你好" }]
        })
      })
    )

    expect(response.status).toBe(200)
    expect(customModelFindUniqueMock).toHaveBeenCalledWith({
      where: { id: "cfg-1" }
    })
    expect(createCustomProviderMock).toHaveBeenCalledWith(
      "https://example.com/v1",
      "gpt-4o-mini",
      "decrypted-custom-key"
    )
  })

  it("should reject custom models when the custom-openai api key is missing", async () => {
    authMock.mockResolvedValue({ user: { id: "user-1" } })
    customModelFindUniqueMock.mockResolvedValue({
      id: "cfg-1",
      userId: "user-1",
      name: "My Gateway",
      baseUrl: "https://example.com/v1",
      modelId: "gpt-4o-mini"
    })
    findUniqueMock.mockResolvedValue(null)

    const response = await POST(
      new Request("http://localhost/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          sessionId: "session-1",
          model: "custom:cfg-1",
          messages: []
        })
      })
    )

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({
      error: "请先在设置中配置 custom-openai 的 API Key"
    })
  })
})
