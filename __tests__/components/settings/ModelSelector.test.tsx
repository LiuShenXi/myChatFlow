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

  it("should append a vision hint to built-in vision models", async () => {
    render(<ModelSelector />)
    await waitFor(() => expect(fetchMock).toHaveBeenCalled())

    expect(screen.getByRole("button", { name: "当前模型" })).toHaveTextContent(
      "GPT-4 视觉"
    )
  })

  it("should keep non-vision built-in model names unchanged", async () => {
    useSessionStore.setState({
      sessions: [],
      currentSessionId: null,
      currentModel: "qwen-plus",
      setSessions: useSessionStore.getState().setSessions,
      setCurrentSession: useSessionStore.getState().setCurrentSession,
      addSession: useSessionStore.getState().addSession,
      removeSession: useSessionStore.getState().removeSession,
      updateSessionTitle: useSessionStore.getState().updateSessionTitle,
      setModel: useSessionStore.getState().setModel
    })

    render(<ModelSelector />)
    await waitFor(() => expect(fetchMock).toHaveBeenCalled())

    expect(screen.getByRole("button", { name: "当前模型" })).toHaveTextContent(
      "Qwen Plus"
    )
  })

  it("should not add a misleading vision label to custom models", async () => {
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

    useSessionStore.setState({
      sessions: [],
      currentSessionId: null,
      currentModel: "custom:cfg-1",
      setSessions: useSessionStore.getState().setSessions,
      setCurrentSession: useSessionStore.getState().setCurrentSession,
      addSession: useSessionStore.getState().addSession,
      removeSession: useSessionStore.getState().removeSession,
      updateSessionTitle: useSessionStore.getState().updateSessionTitle,
      setModel: useSessionStore.getState().setModel
    })

    render(<ModelSelector />)

    expect(await screen.findByRole("button", { name: "My Gateway" })).toBeInTheDocument()
    expect(screen.queryByText("My Gateway 视觉")).not.toBeInTheDocument()
  })

  it("should update the current model when selecting another option", async () => {
    render(<ModelSelector />)
    await waitFor(() => expect(fetchMock).toHaveBeenCalled())

    fireEvent.click(screen.getByRole("button", { name: "GPT-4o 视觉" }))

    expect(useSessionStore.getState().currentModel).toBe("gpt-4o")
  })
})
