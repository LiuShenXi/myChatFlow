import * as React from "react"
import { act, render, screen, waitFor } from "@testing-library/react"
import ChatPage from "@/app/(chat)/page"
import { useChatStore } from "@/store/chat-store"
import { useSessionStore } from "@/store/session-store"

const useChatMock = jest.fn()
const useSessionMock = jest.fn()
const mockFocus = jest.fn()
const latestInputAreaPropsHolder: {
      current:
        | {
            input: string
            disabled: boolean
            errorMessage?: string | null
            onSubmit: (event: React.FormEvent<HTMLFormElement>) => boolean
          }
        | null
} = { current: null }

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
      <div>messages: {messages.length}</div>
      <div>loading: {String(isLoading)}</div>
    </div>
  )
}))

jest.mock("@/components/chat/InputArea", () => {
  const MockInputArea = React.forwardRef<
    HTMLTextAreaElement,
    {
      input: string
      disabled: boolean
      errorMessage?: string | null
      onSubmit: (event: React.FormEvent<HTMLFormElement>) => boolean
    }
  >(function MockInputArea(props, ref) {
    latestInputAreaPropsHolder.current = props

    React.useImperativeHandle(
      ref,
      () =>
        ({
          focus: mockFocus
        }) as unknown as HTMLTextAreaElement
    )

    return (
      <div>
        <div>input: {props.input}</div>
        <div>disabled: {String(props.disabled)}</div>
        <div>error: {props.errorMessage ?? ""}</div>
      </div>
    )
  })

  return {
    InputArea: MockInputArea
  }
})

describe("ChatPage", () => {
  const setMessagesMock = jest.fn()
  const setInputMock = jest.fn()
  const handleSubmitMock = jest.fn()
  const fetchMock = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    latestInputAreaPropsHolder.current = null
    global.fetch = fetchMock as unknown as typeof fetch
    document.body.innerHTML = ""
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
    expect(screen.getByText("disabled: true")).toBeInTheDocument()
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
            content: "hello",
            images: ["data:image/png;base64,abc"]
          },
          {
            id: "message-2",
            role: "assistant",
            content: "hi"
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
        content: "hello",
        experimental_attachments: [
          {
            name: "image-1",
            contentType: "image/png",
            url: "data:image/png;base64,abc"
          }
        ]
      },
      {
        id: "message-2",
        role: "assistant",
        content: "hi"
      }
    ])
    expect(screen.getByText("disabled: false")).toBeInTheDocument()
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
    expect(screen.getByText("loading: true")).toBeInTheDocument()
  })

  it("should show an auth prompt and keep input disabled when unauthenticated", () => {
    useSessionMock.mockReturnValue({
      status: "unauthenticated",
      data: null
    })

    render(<ChatPage />)

    expect(screen.getByText("disabled: true")).toBeInTheDocument()
    expect(mockFocus).not.toHaveBeenCalled()
  })

  it("should focus the input when the page becomes ready for chatting", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        messages: []
      })
    })

    render(<ChatPage />)

    expect(mockFocus).not.toHaveBeenCalled()

    act(() => {
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
    })

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith("/api/sessions/session-1")
    })

    expect(mockFocus).toHaveBeenCalledTimes(1)
  })

  it("should not steal focus from another input element", async () => {
    const otherInput = document.createElement("input")
    document.body.appendChild(otherInput)
    otherInput.focus()

    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        messages: []
      })
    })

    render(<ChatPage />)

    act(() => {
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
    })

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith("/api/sessions/session-1")
    })

    expect(document.activeElement).toBe(otherInput)
    expect(mockFocus).not.toHaveBeenCalled()
  })

  it("should focus the input again when switching to a new session", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        messages: []
      })
    })

    render(<ChatPage />)

    act(() => {
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
    })

    await waitFor(() => {
      expect(mockFocus).toHaveBeenCalledTimes(1)
    })

    act(() => {
      useSessionStore.setState({
        sessions: [],
        currentSessionId: "session-2",
        currentModel: "gpt-4",
        setSessions: useSessionStore.getState().setSessions,
        setCurrentSession: useSessionStore.getState().setCurrentSession,
        addSession: useSessionStore.getState().addSession,
        removeSession: useSessionStore.getState().removeSession,
        updateSessionTitle: useSessionStore.getState().updateSessionTitle,
        setModel: useSessionStore.getState().setModel
      })
    })

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith("/api/sessions/session-2")
    })

    expect(mockFocus).toHaveBeenCalledTimes(2)
  })

  it("should submit stored images as experimental attachments", () => {
    useSessionStore.setState({
      sessions: [],
      currentSessionId: "session-1",
      currentModel: "gpt-4o",
      setSessions: useSessionStore.getState().setSessions,
      setCurrentSession: useSessionStore.getState().setCurrentSession,
      addSession: useSessionStore.getState().addSession,
      removeSession: useSessionStore.getState().removeSession,
      updateSessionTitle: useSessionStore.getState().updateSessionTitle,
      setModel: useSessionStore.getState().setModel
    })

    useChatStore.setState({
      input: "",
      images: ["data:image/png;base64,abc"],
      isStreaming: false,
      setInput: useChatStore.getState().setInput,
      addImage: useChatStore.getState().addImage,
      removeImage: useChatStore.getState().removeImage,
      clearImages: useChatStore.getState().clearImages,
      setIsStreaming: useChatStore.getState().setIsStreaming
    })

    render(<ChatPage />)

    const submitEvent = {
      preventDefault: jest.fn(),
      defaultPrevented: false
    } as unknown as React.FormEvent<HTMLFormElement>

    act(() => {
      latestInputAreaPropsHolder.current?.onSubmit(submitEvent)
    })

    expect(handleSubmitMock).toHaveBeenCalledWith(submitEvent, {
      experimental_attachments: [
        {
          name: "image-1",
          contentType: "image/png",
          url: "data:image/png;base64,abc"
        }
      ]
    })
    expect(latestInputAreaPropsHolder.current?.errorMessage).toBeNull()
  })

  it("should block image submission for models that do not support image input", () => {
    useSessionStore.setState({
      sessions: [],
      currentSessionId: "session-1",
      currentModel: "qwen-plus",
      setSessions: useSessionStore.getState().setSessions,
      setCurrentSession: useSessionStore.getState().setCurrentSession,
      addSession: useSessionStore.getState().addSession,
      removeSession: useSessionStore.getState().removeSession,
      updateSessionTitle: useSessionStore.getState().updateSessionTitle,
      setModel: useSessionStore.getState().setModel
    })

    useChatStore.setState({
      input: "",
      images: ["data:image/png;base64,abc"],
      isStreaming: false,
      setInput: useChatStore.getState().setInput,
      addImage: useChatStore.getState().addImage,
      removeImage: useChatStore.getState().removeImage,
      clearImages: useChatStore.getState().clearImages,
      setIsStreaming: useChatStore.getState().setIsStreaming
    })

    render(<ChatPage />)

    const submitEvent = {
      preventDefault: jest.fn(),
      defaultPrevented: false
    } as unknown as React.FormEvent<HTMLFormElement>

    act(() => {
      latestInputAreaPropsHolder.current?.onSubmit(submitEvent)
    })

    expect(submitEvent.preventDefault).toHaveBeenCalled()
    expect(handleSubmitMock).not.toHaveBeenCalled()
    expect(latestInputAreaPropsHolder.current?.errorMessage).toBe(
      "当前模型不支持图片输入，请切换到支持多模态的模型后再发送"
    )
  })

  it("should clear a stale submit error when switching to a vision model", () => {
    useSessionStore.setState({
      sessions: [],
      currentSessionId: "session-1",
      currentModel: "qwen-plus",
      setSessions: useSessionStore.getState().setSessions,
      setCurrentSession: useSessionStore.getState().setCurrentSession,
      addSession: useSessionStore.getState().addSession,
      removeSession: useSessionStore.getState().removeSession,
      updateSessionTitle: useSessionStore.getState().updateSessionTitle,
      setModel: useSessionStore.getState().setModel
    })

    useChatStore.setState({
      input: "",
      images: ["data:image/png;base64,abc"],
      isStreaming: false,
      setInput: useChatStore.getState().setInput,
      addImage: useChatStore.getState().addImage,
      removeImage: useChatStore.getState().removeImage,
      clearImages: useChatStore.getState().clearImages,
      setIsStreaming: useChatStore.getState().setIsStreaming
    })

    render(<ChatPage />)

    const submitEvent = {
      preventDefault: jest.fn(),
      defaultPrevented: false
    } as unknown as React.FormEvent<HTMLFormElement>

    act(() => {
      latestInputAreaPropsHolder.current?.onSubmit(submitEvent)
    })

    expect(latestInputAreaPropsHolder.current?.errorMessage).toBe(
      "当前模型不支持图片输入，请切换到支持多模态的模型后再发送"
    )

    act(() => {
      useSessionStore.setState({
        sessions: [],
        currentSessionId: "session-1",
        currentModel: "gpt-4o",
        setSessions: useSessionStore.getState().setSessions,
        setCurrentSession: useSessionStore.getState().setCurrentSession,
        addSession: useSessionStore.getState().addSession,
        removeSession: useSessionStore.getState().removeSession,
        updateSessionTitle: useSessionStore.getState().updateSessionTitle,
        setModel: useSessionStore.getState().setModel
      })
    })

    expect(latestInputAreaPropsHolder.current?.errorMessage).toBeNull()
  })

  it("should clear a stale submit error when images are removed", () => {
    useSessionStore.setState({
      sessions: [],
      currentSessionId: "session-1",
      currentModel: "qwen-plus",
      setSessions: useSessionStore.getState().setSessions,
      setCurrentSession: useSessionStore.getState().setCurrentSession,
      addSession: useSessionStore.getState().addSession,
      removeSession: useSessionStore.getState().removeSession,
      updateSessionTitle: useSessionStore.getState().updateSessionTitle,
      setModel: useSessionStore.getState().setModel
    })

    useChatStore.setState({
      input: "",
      images: ["data:image/png;base64,abc"],
      isStreaming: false,
      setInput: useChatStore.getState().setInput,
      addImage: useChatStore.getState().addImage,
      removeImage: useChatStore.getState().removeImage,
      clearImages: useChatStore.getState().clearImages,
      setIsStreaming: useChatStore.getState().setIsStreaming
    })

    render(<ChatPage />)

    const submitEvent = {
      preventDefault: jest.fn(),
      defaultPrevented: false
    } as unknown as React.FormEvent<HTMLFormElement>

    act(() => {
      latestInputAreaPropsHolder.current?.onSubmit(submitEvent)
    })

    expect(latestInputAreaPropsHolder.current?.errorMessage).toBe(
      "当前模型不支持图片输入，请切换到支持多模态的模型后再发送"
    )

    act(() => {
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
    })

    expect(latestInputAreaPropsHolder.current?.errorMessage).toBeNull()
  })
})
