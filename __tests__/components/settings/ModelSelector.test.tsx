import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { ModelSelector } from "@/components/settings/ModelSelector"
import { useSessionStore } from "@/store/session-store"

jest.mock("@/components/ui/dropdown-menu", () => ({
  DropdownMenu: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuTrigger: ({
    children,
    className,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button className={className} {...props}>
      {children}
    </button>
  ),
  DropdownMenuContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  DropdownMenuSeparator: () => <hr />,
  DropdownMenuItem: ({
    children,
    onClick
  }: {
    children: React.ReactNode
    onClick?: () => void
  }) => <button onClick={onClick}>{children}</button>
}))

describe("ModelSelector", () => {
  const fetchMock = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    fetchMock.mockReset()
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => []
    })
    global.fetch = fetchMock as unknown as typeof fetch

    useSessionStore.setState({
      sessions: [],
      currentSessionId: null,
      currentModel: "gpt-4",
      setSessions: useSessionStore.getState().setSessions,
      setCurrentSession: useSessionStore.getState().setCurrentSession,
      addSession: useSessionStore.getState().addSession,
      removeSession: useSessionStore.getState().removeSession,
      updateSessionTitle: useSessionStore.getState().updateSessionTitle,
      setModel: useSessionStore.getState().setModel
    })
  })

  it("should render the current model name", () => {
    render(<ModelSelector />)

    return waitFor(() => {
      expect(screen.getByRole("button", { name: "当前模型" })).toHaveTextContent(
        "GPT-4"
      )
    })
  })

  it("should update the current model when selecting another option", async () => {
    render(<ModelSelector />)
    await waitFor(() => expect(fetchMock).toHaveBeenCalled())

    fireEvent.click(screen.getByRole("button", { name: "GPT-4o" }))

    expect(useSessionStore.getState().currentModel).toBe("gpt-4o")
  })

  it("should render and select domestic models", async () => {
    render(<ModelSelector />)
    await waitFor(() => expect(fetchMock).toHaveBeenCalled())

    expect(screen.getByRole("button", { name: "Qwen Plus" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "GLM-5" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Kimi K2" })).toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: "Qwen Plus" }))

    expect(useSessionStore.getState().currentModel).toBe("qwen-plus")
  })

  it("should render custom models and store custom:<id> when selected", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => [
        {
          id: "cfg-1",
          name: "My Gateway",
          baseUrl: "https://example.com/v1",
          modelId: "gpt-4o-mini"
        }
      ]
    })

    render(<ModelSelector />)

    expect(
      await screen.findByRole("button", { name: "My Gateway" })
    ).toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: "My Gateway" }))

    expect(useSessionStore.getState().currentModel).toBe("custom:cfg-1")
  })
})
