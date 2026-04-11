import { fireEvent, render, screen } from "@testing-library/react"
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
  DropdownMenuItem: ({
    children,
    onClick
  }: {
    children: React.ReactNode
    onClick?: () => void
  }) => <button onClick={onClick}>{children}</button>
}))

describe("ModelSelector", () => {
  beforeEach(() => {
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

    expect(screen.getByRole("button", { name: "当前模型" })).toHaveTextContent(
      "GPT-4"
    )
  })

  it("should update the current model when selecting another option", () => {
    render(<ModelSelector />)

    fireEvent.click(screen.getByRole("button", { name: "GPT-4o" }))

    expect(useSessionStore.getState().currentModel).toBe("gpt-4o")
  })
})
