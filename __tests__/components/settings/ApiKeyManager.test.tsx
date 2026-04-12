import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { ApiKeyManager } from "@/components/settings/ApiKeyManager"

describe("ApiKeyManager", () => {
  const fetchMock = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    fetchMock.mockReset()
    global.fetch = fetchMock as unknown as typeof fetch
  })

  it("should load and show configured providers", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => [
        {
          provider: "openai",
          updatedAt: "2026-04-12T00:00:00.000Z"
        }
      ]
    })

    render(<ApiKeyManager />)

    expect(await screen.findByText("已配置")).toBeInTheDocument()
    expect(screen.getByText("OpenAI")).toBeInTheDocument()
  })

  it("should render domestic provider inputs", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => []
    })

    render(<ApiKeyManager />)

    expect(await screen.findByText("Qwen")).toBeInTheDocument()
    expect(screen.getByText("GLM")).toBeInTheDocument()
    expect(screen.getByText("Kimi")).toBeInTheDocument()
    expect(screen.getByText("豆包")).toBeInTheDocument()
    expect(screen.getByText("自定义 OpenAI-Compatible")).toBeInTheDocument()
    expect(screen.getByLabelText("豆包 endpoint-id")).toBeInTheDocument()
  })

  it("should keep the doubao save button disabled without endpoint id", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => []
    })

    render(<ApiKeyManager />)

    fireEvent.change(await screen.findByLabelText("豆包 API Key"), {
      target: { value: "doubao-key" }
    })

    expect(screen.getByRole("button", { name: "保存 豆包 API Key" })).toBeDisabled()
  })

  it("should save doubao api key together with endpoint id", async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => []
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      })

    render(<ApiKeyManager />)

    fireEvent.change(await screen.findByLabelText("豆包 API Key"), {
      target: { value: "doubao-key" }
    })
    fireEvent.change(screen.getByLabelText("豆包 endpoint-id"), {
      target: { value: "ep-20260412" }
    })
    fireEvent.click(screen.getByRole("button", { name: "保存 豆包 API Key" }))

    await waitFor(() => {
      expect(fetchMock).toHaveBeenNthCalledWith(
        2,
        "/api/keys",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            provider: "doubao",
            apiKey: "doubao-key",
            endpointId: "ep-20260412"
          })
        })
      )
    })
  })

  it("should save a provider api key and clear the input", async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => []
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      })

    render(<ApiKeyManager />)

    const input = await screen.findByLabelText("OpenAI API Key")

    fireEvent.change(input, { target: { value: "sk-openai-test" } })
    fireEvent.click(screen.getByRole("button", { name: "保存 OpenAI API Key" }))

    await waitFor(() => {
      expect(fetchMock).toHaveBeenNthCalledWith(
        2,
        "/api/keys",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            provider: "openai",
            apiKey: "sk-openai-test"
          })
        })
      )
    })

    expect(screen.getByLabelText("OpenAI API Key")).toHaveValue("")
    expect(screen.getByText("已配置")).toBeInTheDocument()
  })

  it("should save a qwen api key", async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => []
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      })

    render(<ApiKeyManager />)

    fireEvent.change(await screen.findByLabelText("Qwen API Key"), {
      target: { value: "sk-qwen-test" }
    })
    fireEvent.click(screen.getByRole("button", { name: "保存 Qwen API Key" }))

    await waitFor(() => {
      expect(fetchMock).toHaveBeenNthCalledWith(
        2,
        "/api/keys",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            provider: "qwen",
            apiKey: "sk-qwen-test"
          })
        })
      )
    })
  })

  it("should delete a configured provider key", async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [
          {
            provider: "openai",
            updatedAt: "2026-04-12T00:00:00.000Z"
          }
        ]
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      })

    render(<ApiKeyManager />)

    fireEvent.click(
      await screen.findByRole("button", { name: "删除 OpenAI API Key" })
    )

    await waitFor(() => {
      expect(fetchMock).toHaveBeenNthCalledWith(
        2,
        "/api/keys",
        expect.objectContaining({
          method: "DELETE",
          body: JSON.stringify({ provider: "openai" })
        })
      )
    })

    await waitFor(() => {
      expect(
        screen.queryByRole("button", { name: "删除 OpenAI API Key" })
      ).not.toBeInTheDocument()
    })
  })
})
