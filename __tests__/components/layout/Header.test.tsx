import { fireEvent, render, screen } from "@testing-library/react"
import { Header } from "@/components/layout/Header"
import { useSessionStore } from "@/store/session-store"
import { useSettingsStore } from "@/store/settings-store"

const useSessionMock = jest.fn()
const signOutMock = jest.fn()

jest.mock("next-auth/react", () => ({
  useSession: () => useSessionMock(),
  signOut: (...args: unknown[]) => signOutMock(...args),
  SessionProvider: ({ children }: { children: React.ReactNode }) => children
}))

describe("Header", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    useSessionMock.mockReturnValue({
      data: {
        user: {
          name: "测试用户",
          image: ""
        }
      }
    })

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

    useSettingsStore.setState({
      theme: "system",
      showSessionList: false,
      setTheme: useSettingsStore.getState().setTheme,
      toggleSessionList: useSettingsStore.getState().toggleSessionList
    })
  })

  it("should render brand name and current model", () => {
    render(<Header onOpenSettings={jest.fn()} />)

    expect(screen.getByText("ChatFlow")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /当前模型/i })).toHaveTextContent(
      "GPT-4"
    )
  })

  it("should toggle the session drawer state", () => {
    render(<Header onOpenSettings={jest.fn()} />)

    fireEvent.click(screen.getByRole("button", { name: "打开会话列表" }))

    expect(useSettingsStore.getState().showSessionList).toBe(true)
  })

  it("should call onOpenSettings when clicking settings", () => {
    const onOpenSettings = jest.fn()

    render(<Header onOpenSettings={onOpenSettings} />)

    fireEvent.click(screen.getByRole("button", { name: "打开设置" }))

    expect(onOpenSettings).toHaveBeenCalledTimes(1)
  })
})
