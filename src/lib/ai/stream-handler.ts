function resolveErrorInfo(error: unknown) {
  let message = "抱歉，发生了错误"
  let status = 500

  if (error instanceof Error) {
    if (
      error.message.includes("API key") ||
      error.message.includes("api key") ||
      error.message.includes("auth")
    ) {
      message = "API Key 无效或已过期，请检查设置"
      status = 401
    } else if (
      error.message.includes("rate limit") ||
      error.message.includes("429") ||
      error.message.includes("速率限制")
    ) {
      message = "请求过于频繁，请稍后再试"
      status = 429
    } else if (
      error.message.includes("context length") ||
      error.message.includes("token")
    ) {
      message = "消息过长，请缩短输入或清理部分历史消息"
      status = 400
    }
  }

  return { message, status }
}

export function getChatErrorMessage(error: unknown) {
  return resolveErrorInfo(error).message
}

export function createErrorResponse(error: unknown): Response {
  const { message, status } = resolveErrorInfo(error)

  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: {
      "Content-Type": "application/json"
    }
  })
}
