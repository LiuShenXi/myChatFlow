import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { SessionDrawer } from "@/components/session/SessionDrawer"
import { useSessionStore } from "@/store/session-store"
import { useSettingsStore } from "@/store/settings-store"
import type { ChatSession } from "@/types/chat"

const useSessionMock = jest.fn()

jest.mock("next-auth/react", () => ({
  useSession: () => useSessionMock()
}))

jest.mock("@/components/ui/sheet", () => ({
  Sheet: ({
    open,
    children
  }: {
    open: boolean
    children: React.ReactNode
  }) => (open ? <div data-testid="session-sheet">{children}</div> : null),
  SheetContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  SheetHeader: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  SheetTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>
}))

jest.mock("@/components/ui/scroll-area", () => ({
  ScrollArea: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  )
}))

function createSession(overrides: Partial<ChatSession> = {}): ChatSession {
  return {
    id: "session-1",
    title: "第一条会话",
    model: "gpt-4",
    createdAt: new Date("2026-04-12T00:00:00.000Z"),
    updatedAt: new Date("2026-04-12T00:00:00.000Z"),
    ...overrides
  }
}

describe("SessionDrawer", () => {
  const fetchMock = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    fetchMock.mockReset()
    global.fetch = fetchMock as unknown as typeof fetch
    useSessionMock.mockReturnValue({
      status: "authenticated",
      data: {
        user: {
          id: "user-1"
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
      showSessionList: true,
      setTheme: useSettingsStore.getState().setTheme,
      toggleSessionList: useSettingsStore.getState().toggleSessionList
    })
  })

  it("should load and render sessions, then select one", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => [
        createSession(),
        createSession({ id: "session-2", title: "第二条会话" })
      ]
    })

    render(<SessionDrawer />)

    expect(await screen.findByText("第一条会话")).toBeInTheDocument()
    expect(screen.getByText("第二条会话")).toBeInTheDocument()

    fireEvent.click(screen.getByText("第二条会话"))

    expect(useSessionStore.getState().currentSessionId).toBe("session-2")
    expect(useSettingsStore.getState().showSessionList).toBe(false)
  })

  it("should create a session with the current model", async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [createSession()]
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () =>
          createSession({ id: "session-3", title: "新对话", model: "gpt-4" })
      })

    render(<SessionDrawer />)

    await screen.findByText("对话记录")
    fireEvent.click(screen.getByRole("button", { name: "新对话" }))

    await waitFor(() => {
      expect(fetchMock).toHaveBeenNthCalledWith(
        2,
        "/api/sessions",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ model: "gpt-4" })
        })
      )
    })

    expect(useSessionStore.getState().currentSessionId).toBe("session-3")
    expect(useSessionStore.getState().sessions[0]?.id).toBe("session-3")
  })

  it("should rename and delete a session", async () => {
    useSessionStore.setState({
      sessions: [createSession()],
      currentSessionId: "session-1",
      currentModel: "gpt-4",
      setSessions: useSessionStore.getState().setSessions,
      setCurrentSession: useSessionStore.getState().setCurrentSession,
      addSession: useSessionStore.getState().addSession,
      removeSession: useSessionStore.getState().removeSession,
      updateSessionTitle: useSessionStore.getState().updateSessionTitle,
      setModel: useSessionStore.getState().setModel
    })

    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [createSession()]
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      })

    render(<SessionDrawer />)

    fireEvent.click(await screen.findByRole("button", { name: "重命名会话" }))
    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: "更新后的标题" }
    })
    fireEvent.click(screen.getByRole("button", { name: "确认重命名" }))

    await waitFor(() => {
      expect(fetchMock).toHaveBeenNthCalledWith(
        2,
        "/api/sessions/session-1",
        expect.objectContaining({
          method: "PATCH",
          body: JSON.stringify({ title: "更新后的标题" })
        })
      )
    })

    expect(useSessionStore.getState().sessions[0]?.title).toBe("更新后的标题")

    fireEvent.click(screen.getByRole("button", { name: "删除会话" }))

    await waitFor(() => {
      expect(fetchMock).toHaveBeenNthCalledWith(
        3,
        "/api/sessions/session-1",
        expect.objectContaining({
          method: "DELETE"
        })
      )
    })

    expect(useSessionStore.getState().sessions).toEqual([])
    expect(useSessionStore.getState().currentSessionId).toBeNull()
  })

  it("should show an auth prompt instead of loading sessions when unauthenticated", () => {
    useSessionMock.mockReturnValue({
      status: "unauthenticated",
      data: null
    })

    render(<SessionDrawer />)

    expect(screen.getByText("登录后才能查看和创建会话")).toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("should auto-create the first session when the user has no sessions", async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => []
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () =>
          createSession({ id: "session-auto", title: "新对话", model: "gpt-4" })
      })

    render(<SessionDrawer />)

    await waitFor(() => {
      expect(fetchMock).toHaveBeenNthCalledWith(
        2,
        "/api/sessions",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ model: "gpt-4" })
        })
      )
    })

    expect(useSessionStore.getState().currentSessionId).toBe("session-auto")
    expect(useSessionStore.getState().sessions[0]?.id).toBe("session-auto")
  })
})
