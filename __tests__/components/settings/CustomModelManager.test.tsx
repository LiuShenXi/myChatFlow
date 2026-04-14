import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { CustomModelManager } from "@/components/settings/CustomModelManager"

describe("CustomModelManager", () => {
  const fetchMock = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    fetchMock.mockReset()
    global.fetch = fetchMock as unknown as typeof fetch
  })

  it("should render existing custom models", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => [
        {
          id: "cfg-1",
          name: "My Gateway",
          baseUrl: "https://example.com/v1",
          modelId: "gpt-4o-mini",
          visionCapability: "unknown",
          visionCapabilitySource: "inferred",
          hasApiKey: true,
          updatedAt: "2026-04-12T00:00:00.000Z"
        }
      ]
    })

    render(<CustomModelManager />)

    expect(await screen.findByText("My Gateway")).toBeInTheDocument()
    expect(screen.getByText("https://example.com/v1")).toBeInTheDocument()
    expect(screen.getByText("已配置密钥")).toBeInTheDocument()
    expect(screen.getByText("图片能力 自动识别中")).toBeInTheDocument()
    expect(screen.getByText("来源 系统识别")).toBeInTheDocument()
  })

  it("should create a custom model with its own api key", async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => []
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: "cfg-1",
          name: "My Gateway",
          baseUrl: "https://example.com/v1",
          modelId: "gpt-4o-mini",
          visionCapability: "vision",
          visionCapabilitySource: "manual",
          hasApiKey: true,
          updatedAt: "2026-04-12T00:00:00.000Z"
        })
      })

    render(<CustomModelManager />)

    fireEvent.change(await screen.findByLabelText("Custom model name"), {
      target: { value: "My Gateway" }
    })
    fireEvent.change(screen.getByLabelText("Custom model base URL"), {
      target: { value: "https://example.com/v1" }
    })
    fireEvent.change(screen.getByLabelText("Custom model ID"), {
      target: { value: "gpt-4o-mini" }
    })
    fireEvent.change(screen.getByLabelText("Custom model API Key"), {
      target: { value: "sk-test" }
    })
    fireEvent.change(screen.getByLabelText("Custom model vision capability"), {
      target: { value: "vision" }
    })
    fireEvent.click(screen.getByRole("button", { name: "保存自定义模型" }))

    await waitFor(() => {
      expect(fetchMock).toHaveBeenLastCalledWith(
        "/api/custom-models",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            name: "My Gateway",
            baseUrl: "https://example.com/v1",
            modelId: "gpt-4o-mini",
            visionCapability: "vision",
            apiKey: "sk-test"
          })
        })
      )
    })

    expect(await screen.findByText("My Gateway")).toBeInTheDocument()
  })

  it("should update a custom model and replace the api key when provided", async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [
          {
            id: "cfg-1",
            name: "My Gateway",
            baseUrl: "https://example.com/v1",
            modelId: "gpt-4o-mini",
            visionCapability: "unknown",
            visionCapabilitySource: "inferred",
            hasApiKey: true,
            updatedAt: "2026-04-12T00:00:00.000Z"
          }
        ]
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: "cfg-1",
          name: "Updated Gateway",
          baseUrl: "https://new.example.com/v1",
          modelId: "gpt-4.1-mini",
          visionCapability: "vision",
          visionCapabilitySource: "manual",
          hasApiKey: true,
          updatedAt: "2026-04-12T00:00:00.000Z"
        })
      })

    render(<CustomModelManager />)

    fireEvent.click(await screen.findByRole("button", { name: "编辑 My Gateway" }))
    fireEvent.change(screen.getByLabelText("Custom model name"), {
      target: { value: "Updated Gateway" }
    })
    fireEvent.change(screen.getByLabelText("Custom model base URL"), {
      target: { value: "https://new.example.com/v1" }
    })
    fireEvent.change(screen.getByLabelText("Custom model ID"), {
      target: { value: "gpt-4.1-mini" }
    })
    fireEvent.change(screen.getByLabelText("Custom model API Key"), {
      target: { value: "sk-updated" }
    })
    fireEvent.change(screen.getByLabelText("Custom model vision capability"), {
      target: { value: "vision" }
    })
    fireEvent.click(screen.getByRole("button", { name: "保存自定义模型" }))

    await waitFor(() => {
      expect(fetchMock).toHaveBeenLastCalledWith(
        "/api/custom-models/cfg-1",
        expect.objectContaining({
          method: "PATCH",
          body: JSON.stringify({
            name: "Updated Gateway",
            baseUrl: "https://new.example.com/v1",
            modelId: "gpt-4.1-mini",
            visionCapability: "vision",
            apiKey: "sk-updated"
          })
        })
      )
    })

    expect(await screen.findByText("Updated Gateway")).toBeInTheDocument()
  })

  it("should keep the existing api key when editing without entering a new key", async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [
          {
            id: "cfg-1",
            name: "My Gateway",
            baseUrl: "https://example.com/v1",
            modelId: "gpt-4o-mini",
            visionCapability: "vision",
            visionCapabilitySource: "manual",
            hasApiKey: true,
            updatedAt: "2026-04-12T00:00:00.000Z"
          }
        ]
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: "cfg-1",
          name: "Updated Gateway",
          baseUrl: "https://new.example.com/v1",
          modelId: "gpt-4.1-mini",
          visionCapability: "unknown",
          visionCapabilitySource: "manual",
          hasApiKey: true,
          updatedAt: "2026-04-12T00:00:00.000Z"
        })
      })

    render(<CustomModelManager />)

    fireEvent.click(await screen.findByRole("button", { name: "编辑 My Gateway" }))
    fireEvent.change(screen.getByLabelText("Custom model name"), {
      target: { value: "Updated Gateway" }
    })
    fireEvent.change(screen.getByLabelText("Custom model base URL"), {
      target: { value: "https://new.example.com/v1" }
    })
    fireEvent.change(screen.getByLabelText("Custom model ID"), {
      target: { value: "gpt-4.1-mini" }
    })
    fireEvent.change(screen.getByLabelText("Custom model vision capability"), {
      target: { value: "unknown" }
    })
    fireEvent.click(screen.getByRole("button", { name: "保存自定义模型" }))

    await waitFor(() => {
      expect(fetchMock).toHaveBeenLastCalledWith(
        "/api/custom-models/cfg-1",
        expect.objectContaining({
          method: "PATCH",
          body: JSON.stringify({
            name: "Updated Gateway",
            baseUrl: "https://new.example.com/v1",
            modelId: "gpt-4.1-mini",
            visionCapability: "unknown"
          })
        })
      )
    })
  })

  it("should delete a custom model", async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [
          {
            id: "cfg-1",
            name: "My Gateway",
            baseUrl: "https://example.com/v1",
            modelId: "gpt-4o-mini",
            visionCapability: "unknown",
            visionCapabilitySource: "inferred",
            hasApiKey: true,
            updatedAt: "2026-04-12T00:00:00.000Z"
          }
        ]
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      })

    render(<CustomModelManager />)

    fireEvent.click(await screen.findByRole("button", { name: "删除 My Gateway" }))

    await waitFor(() => {
      expect(fetchMock).toHaveBeenLastCalledWith(
        "/api/custom-models/cfg-1",
        expect.objectContaining({
          method: "DELETE"
        })
      )
    })

    await waitFor(() => {
      expect(screen.queryByText("My Gateway")).not.toBeInTheDocument()
    })
  })
})
