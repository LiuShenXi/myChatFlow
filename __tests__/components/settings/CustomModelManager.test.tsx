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
          updatedAt: "2026-04-12T00:00:00.000Z"
        }
      ]
    })

    render(<CustomModelManager />)

    expect(await screen.findByText("My Gateway")).toBeInTheDocument()
    expect(screen.getByText("https://example.com/v1")).toBeInTheDocument()
  })

  it("should create a custom model", async () => {
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
          updatedAt: "2026-04-12T00:00:00.000Z"
        })
      })

    render(<CustomModelManager />)

    fireEvent.change(await screen.findByLabelText("自定义模型名称"), {
      target: { value: "My Gateway" }
    })
    fireEvent.change(screen.getByLabelText("自定义 Base URL"), {
      target: { value: "https://example.com/v1" }
    })
    fireEvent.change(screen.getByLabelText("自定义 Model ID"), {
      target: { value: "gpt-4o-mini" }
    })
    fireEvent.click(screen.getByRole("button", { name: "保存自定义模型" }))

    await waitFor(() => {
      expect(fetchMock).toHaveBeenLastCalledWith(
        "/api/custom-models",
        expect.objectContaining({
          method: "POST"
        })
      )
    })

    expect(await screen.findByText("My Gateway")).toBeInTheDocument()
  })

  it("should update a custom model", async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [
          {
            id: "cfg-1",
            name: "My Gateway",
            baseUrl: "https://example.com/v1",
            modelId: "gpt-4o-mini",
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
          updatedAt: "2026-04-12T00:00:00.000Z"
        })
      })

    render(<CustomModelManager />)

    fireEvent.click(await screen.findByRole("button", { name: "编辑 My Gateway" }))
    fireEvent.change(screen.getByLabelText("自定义模型名称"), {
      target: { value: "Updated Gateway" }
    })
    fireEvent.change(screen.getByLabelText("自定义 Base URL"), {
      target: { value: "https://new.example.com/v1" }
    })
    fireEvent.change(screen.getByLabelText("自定义 Model ID"), {
      target: { value: "gpt-4.1-mini" }
    })
    fireEvent.click(screen.getByRole("button", { name: "保存自定义模型" }))

    await waitFor(() => {
      expect(fetchMock).toHaveBeenLastCalledWith(
        "/api/custom-models/cfg-1",
        expect.objectContaining({
          method: "PATCH"
        })
      )
    })

    expect(await screen.findByText("Updated Gateway")).toBeInTheDocument()
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
