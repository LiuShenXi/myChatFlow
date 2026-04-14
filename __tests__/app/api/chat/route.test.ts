/** @jest-environment node */
const authMock = jest.fn()
const findUniqueMock = jest.fn()
const customModelFindUniqueMock = jest.fn()
const customModelUpdateMock = jest.fn()
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
      findUnique: (...args: unknown[]) => customModelFindUniqueMock(...args),
      update: (...args: unknown[]) => customModelUpdateMock(...args)
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
    const toDataStreamResponseMock = jest.fn(() => new Response("stream-ok", { status: 200 }))

    streamTextMock.mockImplementation(async ({ onFinish }) => {
      await onFinish({
        text: "助手回复",
        usage: {
          totalTokens: 42
        }
      })

      return {
        toDataStreamResponse: toDataStreamResponseMock
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
    expect(toDataStreamResponseMock).toHaveBeenCalledWith(
      expect.objectContaining({
        getErrorMessage: expect.any(Function)
      })
    )
    expect(
      toDataStreamResponseMock.mock.calls[0][0].getErrorMessage(
        new Error("您的账户已达到速率限制，请您控制请求频率")
      )
    ).toBe("请求过于频繁，请稍后再试")
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

  it("should reject image input for a non-vision built-in model", async () => {
    authMock.mockResolvedValue({ user: { id: "user-1" } })
    findUniqueMock.mockResolvedValue({ encryptedKey: "encrypted-value" })

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
              id: "message-1",
              role: "user",
              content: "看图",
              experimental_attachments: [
                {
                  name: "image-1",
                  contentType: "image/png",
                  url: "data:image/png;base64,abc"
                }
              ]
            }
          ]
        })
      })
    )

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({
      error: "当前模型不支持图片输入，请切换到支持多模态的模型后再发送"
    })
  })

  it("should pass image attachments through to streamText for a vision model", async () => {
    authMock.mockResolvedValue({ user: { id: "user-1" } })
    findUniqueMock.mockResolvedValue({ encryptedKey: "encrypted-value" })
    decryptMock.mockReturnValue("decrypted-value")
    getProviderMock.mockReturnValue({ provider: "openai-model" })
    streamTextMock.mockResolvedValue({
      toDataStreamResponse: () => new Response("stream-ok", { status: 200 })
    })

    await POST(
      new Request("http://localhost/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          sessionId: "session-1",
          model: "gpt-4o",
          messages: [
            {
              id: "message-1",
              role: "user",
              content: "看图",
              experimental_attachments: [
                {
                  name: "image-1",
                  contentType: "image/png",
                  url: "data:image/png;base64,abc"
                }
              ]
            }
          ]
        })
      })
    )

    expect(streamTextMock).toHaveBeenCalledWith(
      expect.objectContaining({
        messages: [
          expect.objectContaining({
            experimental_attachments: [
              expect.objectContaining({
                url: "data:image/png;base64,abc"
              })
            ]
          })
        ]
      })
    )
  })

  it("should persist image urls extracted from attachments", async () => {
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

    await POST(
      new Request("http://localhost/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          sessionId: "session-1",
          model: "gpt-4o",
          messages: [
            {
              id: "message-1",
              role: "user",
              content: "看图",
              experimental_attachments: [
                {
                  name: "image-1",
                  contentType: "image/png",
                  url: "data:image/png;base64,abc"
                }
              ]
            }
          ]
        })
      })
    )

    expect(messageCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          sessionId: "session-1",
          role: "user",
          content: "看图",
          images: ["data:image/png;base64,abc"]
        })
      })
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
    customModelFindUniqueMock.mockResolvedValue({
      id: "cfg-1",
      userId: "user-1",
      name: "My Gateway",
      baseUrl: "https://example.com/v1",
      modelId: "gpt-4o-mini",
      visionCapability: "unknown",
      visionCapabilitySource: "inferred",
      encryptedApiKey: "encrypted-custom-key"
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
    expect(findUniqueMock).not.toHaveBeenCalled()
    expect(decryptMock).toHaveBeenCalledWith("encrypted-custom-key")
    expect(createCustomProviderMock).toHaveBeenCalledWith(
      "https://example.com/v1",
      "gpt-4o-mini",
      "decrypted-custom-key"
    )
  })

  it("should reject custom models when the custom model api key is missing", async () => {
    authMock.mockResolvedValue({ user: { id: "user-1" } })
    customModelFindUniqueMock.mockResolvedValue({
      id: "cfg-1",
      userId: "user-1",
      name: "My Gateway",
      baseUrl: "https://example.com/v1",
      modelId: "gpt-4o-mini",
      visionCapability: "unknown",
      visionCapabilitySource: "inferred",
      encryptedApiKey: ""
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
          messages: []
        })
      })
    )

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({
      error: "该自定义模型缺少 API Key，请在设置中重新保存"
    })
  })

  it("should allow image input for custom models when capability is unknown", async () => {
    authMock.mockResolvedValue({ user: { id: "user-1" } })
    customModelFindUniqueMock.mockResolvedValue({
      id: "cfg-1",
      userId: "user-1",
      name: "Mystery Gateway",
      baseUrl: "https://gateway.example.com/v1",
      modelId: "acme-chat",
      visionCapability: "unknown",
      visionCapabilitySource: "inferred",
      encryptedApiKey: "encrypted-custom-key"
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
          messages: [
            {
              id: "message-1",
              role: "user",
              content: "看图",
              experimental_attachments: [
                {
                  name: "image-1",
                  contentType: "image/png",
                  url: "data:image/png;base64,abc"
                }
              ]
            }
          ]
        })
      })
    )

    expect(response.status).toBe(200)
    expect(streamTextMock).toHaveBeenCalled()
    expect(createCustomProviderMock).toHaveBeenCalledWith(
      "https://gateway.example.com/v1",
      "acme-chat",
      "decrypted-custom-key"
    )
  })

  it("should reject image input for custom models inferred as text-only", async () => {
    authMock.mockResolvedValue({ user: { id: "user-1" } })
    customModelFindUniqueMock.mockResolvedValue({
      id: "cfg-1",
      userId: "user-1",
      name: "GLM5.1",
      baseUrl: "https://open.bigmodel.cn/api/paas/v4",
      modelId: "glm-5.1",
      visionCapability: "unknown",
      visionCapabilitySource: "inferred",
      encryptedApiKey: "encrypted-custom-key"
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
          messages: [
            {
              id: "message-1",
              role: "user",
              content: "看图",
              experimental_attachments: [
                {
                  name: "image-1",
                  contentType: "image/png",
                  url: "data:image/png;base64,abc"
                }
              ]
            }
          ]
        })
      })
    )

    expect(response.status).toBe(400)
    expect(streamTextMock).not.toHaveBeenCalled()
    await expect(response.json()).resolves.toEqual({
      error: "当前模型不支持图片输入，请切换到支持多模态的模型后再发送"
    })
  })

  it("should allow image input for custom models inferred as vision", async () => {
    authMock.mockResolvedValue({ user: { id: "user-1" } })
    customModelFindUniqueMock.mockResolvedValue({
      id: "cfg-vision",
      userId: "user-1",
      name: "GLM-5V-Turbo",
      baseUrl: "https://open.bigmodel.cn/api/paas/v4",
      modelId: "glm-5v-turbo",
      visionCapability: "unknown",
      visionCapabilitySource: "inferred",
      encryptedApiKey: "encrypted-custom-key"
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
          model: "custom:cfg-vision",
          messages: [
            {
              id: "message-1",
              role: "user",
              content: "看图",
              experimental_attachments: [
                {
                  name: "image-1",
                  contentType: "image/png",
                  url: "data:image/png;base64,abc"
                }
              ]
            }
          ]
        })
      })
    )

    expect(response.status).toBe(200)
    expect(streamTextMock).toHaveBeenCalled()
    expect(createCustomProviderMock).toHaveBeenCalledWith(
      "https://open.bigmodel.cn/api/paas/v4",
      "glm-5v-turbo",
      "decrypted-custom-key"
    )
  })

  it("should learn a custom model as text-only when stream error clearly shows no vision support", async () => {
    authMock.mockResolvedValue({ user: { id: "user-1" } })
    customModelFindUniqueMock.mockResolvedValue({
      id: "cfg-1",
      userId: "user-1",
      name: "GLM5.1",
      baseUrl: "https://open.bigmodel.cn/api/paas/v4",
      modelId: "glm-5.1",
      visionCapability: "vision",
      visionCapabilitySource: "manual",
      encryptedApiKey: "encrypted-custom-key"
    })
    decryptMock.mockReturnValue("decrypted-custom-key")
    createCustomProviderMock.mockReturnValue({ provider: "custom-model" })
    customModelUpdateMock.mockResolvedValue({})
    const toDataStreamResponseMock = jest.fn(() => new Response("stream-ok", { status: 200 }))
    streamTextMock.mockResolvedValue({
      toDataStreamResponse: toDataStreamResponseMock
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
          messages: [
            {
              id: "message-1",
              role: "user",
              content: "看图",
              experimental_attachments: [
                {
                  name: "image-1",
                  contentType: "image/png",
                  url: "data:image/png;base64,abc"
                }
              ]
            }
          ]
        })
      })
    )

    expect(response.status).toBe(200)
    expect(toDataStreamResponseMock).toHaveBeenCalledWith(
      expect.objectContaining({
        getErrorMessage: expect.any(Function)
      })
    )
    expect(
      toDataStreamResponseMock.mock.calls[0][0].getErrorMessage(
        new Error("仅支持纯文本")
      )
    ).toContain("已自动识别该模型暂不支持图片输入")
    expect(customModelUpdateMock).toHaveBeenCalledWith({
      where: { id: "cfg-1" },
      data: {
        visionCapability: "text-only",
        visionCapabilitySource: "learned"
      }
    })
  })
})
