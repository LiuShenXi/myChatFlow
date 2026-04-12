import { render, screen, waitFor } from "@testing-library/react"
import ChatPage from "@/app/(chat)/page"
import { useChatStore } from "@/store/chat-store"
import { useSessionStore } from "@/store/session-store"

const useChatMock = jest.fn()
const useSessionMock = jest.fn()

jest.mock("ai/react", () => ({
  useChat: (...args: unknown[]) => useChatMock(...args)
}))

jest.mock("next-auth/react", () => ({
  useSession: () => useSessionMock()
}))

jest.mock("@/components/chat/MessageList", () => ({
  MessageList: ({
    messages,
    isLoading
  }: {
    messages: Array<{ id: string; content: string }>
    isLoading: boolean
  }) => (
    <div>
      <div>消息数 {messages.length}</div>
      <div>加载中 {String(isLoading)}</div>
    </div>
  )
}))

jest.mock("@/components/chat/InputArea", () => ({
  InputArea: ({
    input,
    disabled
  }: {
    input: string
    disabled: boolean
  }) => (
    <div>
      <div>输入框 {input}</div>
      <div>禁用状态 {String(disabled)}</div>
    </div>
  )
}))

describe("ChatPage", () => {
  const setMessagesMock = jest.fn()
  const setInputMock = jest.fn()
  const handleSubmitMock = jest.fn()
  const fetchMock = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
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

    useChatStore.setState({
      input: "",
      images: [],
      isStreaming: false,
      setInput: useChatStore.getState().setInput,
      addImage: useChatStore.getState().addImage,
      removeImage: useChatStore.getState().removeImage,
      clearImages: useChatStore.getState().clearImages,
      setIsStreaming: useChatStore.getState().setIsStreaming
    })

    useChatMock.mockReturnValue({
      messages: [],
      input: "",
      setInput: setInputMock,
      handleSubmit: handleSubmitMock,
      isLoading: false,
      setMessages: setMessagesMock
    })
  })

  it("should configure useChat and clear messages when there is no active session", () => {
    render(<ChatPage />)

    expect(useChatMock).toHaveBeenCalledWith({
      api: "/api/chat",
      body: {
        sessionId: null,
        model: "gpt-4"
      }
    })
    expect(setMessagesMock).toHaveBeenCalledWith([])
    expect(screen.getByText("禁用状态 true")).toBeInTheDocument()
  })

  it("should load message history for the current session", async () => {
    useSessionStore.setState({
      sessions: [],
      currentSessionId: "session-1",
      currentModel: "gpt-4",
      setSessions: useSessionStore.getState().setSessions,
      setCurrentSession: useSessionStore.getState().setCurrentSession,
      addSession: useSessionStore.getState().addSession,
      removeSession: useSessionStore.getState().removeSession,
      updateSessionTitle: useSessionStore.getState().updateSessionTitle,
      setModel: useSessionStore.getState().setModel
    })

    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        messages: [
          {
            id: "message-1",
            role: "user",
            content: "你好"
          },
          {
            id: "message-2",
            role: "assistant",
            content: "你好，请问想聊什么？"
          }
        ]
      })
    })

    render(<ChatPage />)

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith("/api/sessions/session-1")
    })

    expect(setMessagesMock).toHaveBeenLastCalledWith([
      {
        id: "message-1",
        role: "user",
        content: "你好"
      },
      {
        id: "message-2",
        role: "assistant",
        content: "你好，请问想聊什么？"
      }
    ])
    expect(screen.getByText("禁用状态 false")).toBeInTheDocument()
  })

  it("should sync loading state to the chat store", () => {
    useSessionStore.setState({
      sessions: [],
      currentSessionId: "session-1",
      currentModel: "gpt-4",
      setSessions: useSessionStore.getState().setSessions,
      setCurrentSession: useSessionStore.getState().setCurrentSession,
      addSession: useSessionStore.getState().addSession,
      removeSession: useSessionStore.getState().removeSession,
      updateSessionTitle: useSessionStore.getState().updateSessionTitle,
      setModel: useSessionStore.getState().setModel
    })

    useChatMock.mockReturnValue({
      messages: [],
      input: "hello",
      setInput: setInputMock,
      handleSubmit: handleSubmitMock,
      isLoading: true,
      setMessages: setMessagesMock
    })

    render(<ChatPage />)

    expect(useChatStore.getState().isStreaming).toBe(true)
    expect(screen.getByText("加载中 true")).toBeInTheDocument()
  })

  it("should show an auth prompt and keep input disabled when unauthenticated", () => {
    useSessionMock.mockReturnValue({
      status: "unauthenticated",
      data: null
    })

    render(<ChatPage />)

    expect(screen.getByText("登录后即可开始对话")).toBeInTheDocument()
    expect(screen.getByText("禁用状态 true")).toBeInTheDocument()
  })
})
