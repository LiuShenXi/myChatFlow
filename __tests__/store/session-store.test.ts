import type { ChatSession } from "@/types/chat"
import { useSessionStore } from "@/store/session-store"

function createSession(overrides: Partial<ChatSession> = {}): ChatSession {
  return {
    id: "session-1",
    title: "新对话",
    model: "gpt-4",
    createdAt: new Date("2026-04-12T00:00:00.000Z"),
    updatedAt: new Date("2026-04-12T00:00:00.000Z"),
    ...overrides
  }
}

describe("session-store", () => {
  beforeEach(() => {
    useSessionStore.setState({
      sessions: [],
      currentSessionId: null,
      currentModel: "gpt-4"
    })
  })

  it("should set sessions", () => {
    const sessions = [createSession()]

    useSessionStore.getState().setSessions(sessions)

    expect(useSessionStore.getState().sessions).toEqual(sessions)
  })

  it("should set current session", () => {
    useSessionStore.getState().setCurrentSession("session-1")

    expect(useSessionStore.getState().currentSessionId).toBe("session-1")
  })

  it("should add a session and make it current", () => {
    const session = createSession()

    useSessionStore.getState().addSession(session)

    expect(useSessionStore.getState().sessions).toEqual([session])
    expect(useSessionStore.getState().currentSessionId).toBe(session.id)
  })

  it("should remove a session and clear currentSessionId if needed", () => {
    const session = createSession()

    useSessionStore.setState({
      sessions: [session],
      currentSessionId: session.id,
      currentModel: "gpt-4"
    })

    useSessionStore.getState().removeSession(session.id)

    expect(useSessionStore.getState().sessions).toEqual([])
    expect(useSessionStore.getState().currentSessionId).toBeNull()
  })

  it("should update a session title", () => {
    const session = createSession()

    useSessionStore.setState({
      sessions: [session],
      currentSessionId: null,
      currentModel: "gpt-4"
    })

    useSessionStore.getState().updateSessionTitle(session.id, "已重命名")

    expect(useSessionStore.getState().sessions[0]?.title).toBe("已重命名")
  })

  it("should set current model", () => {
    useSessionStore.getState().setModel("gpt-4o")

    expect(useSessionStore.getState().currentModel).toBe("gpt-4o")
  })
})
