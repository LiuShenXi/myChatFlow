/** @jest-environment node */
import { createErrorResponse } from "@/lib/ai/stream-handler"

describe("createErrorResponse", () => {
  it("should map api key errors to 401", async () => {
    const response = createErrorResponse(new Error("API key invalid"))

    await expect(response.json()).resolves.toEqual({
      error: "API Key 无效或已过期，请检查设置"
    })
    expect(response.status).toBe(401)
  })

  it("should map rate limit errors to 429", async () => {
    const response = createErrorResponse(new Error("429 rate limit exceeded"))

    await expect(response.json()).resolves.toEqual({
      error: "请求过于频繁，请稍后再试"
    })
    expect(response.status).toBe(429)
  })

  it("should map chinese rate limit errors to 429", async () => {
    const response = createErrorResponse(
      new Error("您的账户已达到速率限制，请您控制请求频率")
    )

    await expect(response.json()).resolves.toEqual({
      error: "请求过于频繁，请稍后再试"
    })
    expect(response.status).toBe(429)
  })

  it("should map token errors to 400", async () => {
    const response = createErrorResponse(new Error("context length exceeded"))

    await expect(response.json()).resolves.toEqual({
      error: "消息过长，请缩短输入或清理部分历史消息"
    })
    expect(response.status).toBe(400)
  })

  it("should use generic fallback for unknown errors", async () => {
    const response = createErrorResponse(new Error("unknown failure"))

    await expect(response.json()).resolves.toEqual({
      error: "抱歉，发生了错误"
    })
    expect(response.status).toBe(500)
  })
})
