import * as React from "react"
import { act, render, screen, waitFor } from "@testing-library/react"
import ChatPage from "@/app/(chat)/page"
import { useChatStore } from "@/store/chat-store"
import { useSessionStore } from "@/store/session-store"

const useChatMock = jest.fn()
const useSessionMock = jest.fn()
const mockFocus = jest.fn()
let latestInputAreaProps:
  | {
      onSubmit?: (event: React.FormEvent<HTMLFormElement>) => void
      errorMessage?: string | null
    }
  | undefined

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

jest.mock("@/components/chat/InputArea", () => {
  const MockInputArea = React.forwardRef<
    HTMLTextAreaElement,
    {
      input: string
      disabled: boolean
      onSubmit?: (event: React.FormEvent<HTMLFormElement>) => void
      errorMessage?: string | null
    }
  >(function MockInputArea({ input, disabled, onSubmit, errorMessage }, ref) {
    latestInputAreaProps = {
      onSubmit,
      errorMessage
    }

    React.useImperativeHandle(
      ref,
      () =>
        ({
          focus: mockFocus
        }) as unknown as HTMLTextAreaElement
    )

    return (
      <div>
        <div>输入框 {input}</div>
        <div>禁用状态 {String(disabled)}</div>
        <div>错误信息 {errorMessage ?? "无"}</div>
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

  function mockCustomModelFetch(customModels: Array<Record<string, unknown>>) {
    fetchMock.mockImplementation((input: RequestInfo | URL) => {
      const url = String(input)

      if (url === "/api/custom-models") {
        return Promise.resolve({
          ok: true,
          json: async () => customModels
        })
      }

      if (url.startsWith("/api/sessions/")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            messages: []
          })
        })
      }

      return Promise.resolve({
        ok: false,
        json: async () => ({})
      })
    })
  }

  async function waitForCustomModelsLoaded() {
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith("/api/custom-models")
    })

    await act(async () => {
      await Promise.resolve()
      await Promise.resolve()
    })
  }

  beforeEach(() => {
    jest.clearAllMocks()
    latestInputAreaProps = undefined
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

  it("should map stored images back to experimental attachments when loading history", async () => {
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

    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        messages: [
          {
            id: "message-1",
            role: "user",
            content: "看图",
            images: ["data:image/png;base64,abc"]
          }
        ]
      })
    })

    render(<ChatPage />)

    await waitFor(() => {
      expect(setMessagesMock).toHaveBeenLastCalledWith([
        expect.objectContaining({
          id: "message-1",
          role: "user",
          content: "看图",
          experimental_attachments: [
            expect.objectContaining({
              url: "data:image/png;base64,abc"
            })
          ]
        })
      ])
    })
  })

  it("should submit chat images as experimental attachments", async () => {
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
      ...useChatStore.getState(),
      images: ["data:image/png;base64,abc"]
    })

    render(<ChatPage />)

    await act(async () => {
      latestInputAreaProps?.onSubmit?.({
        preventDefault: jest.fn()
      } as unknown as React.FormEvent<HTMLFormElement>)
    })

    expect(handleSubmitMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        experimental_attachments: [
          expect.objectContaining({
            url: "data:image/png;base64,abc"
          })
        ]
      })
    )
  })

  it("should block image submit for a non-vision model and show an error", async () => {
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
      ...useChatStore.getState(),
      images: ["data:image/png;base64,abc"]
    })

    render(<ChatPage />)

    const preventDefault = jest.fn()

    await act(async () => {
      latestInputAreaProps?.onSubmit?.({
        preventDefault
      } as unknown as React.FormEvent<HTMLFormElement>)
    })

    expect(preventDefault).toHaveBeenCalled()
    expect(handleSubmitMock).not.toHaveBeenCalled()
    expect(
      screen.getByText("错误信息 当前模型不支持图片输入，请切换到支持多模态的模型后再发送")
    ).toBeInTheDocument()
  })

  it("should allow image submit for a custom model when capability is still unknown", async () => {
    useSessionStore.setState({
      sessions: [],
      currentSessionId: "session-1",
      currentModel: "custom:cfg-1",
      setSessions: useSessionStore.getState().setSessions,
      setCurrentSession: useSessionStore.getState().setCurrentSession,
      addSession: useSessionStore.getState().addSession,
      removeSession: useSessionStore.getState().removeSession,
      updateSessionTitle: useSessionStore.getState().updateSessionTitle,
      setModel: useSessionStore.getState().setModel
    })

    useChatStore.setState({
      ...useChatStore.getState(),
      images: ["data:image/png;base64,abc"]
    })

    mockCustomModelFetch([
      {
        id: "cfg-1",
        baseUrl: "https://gateway.example.com/v1",
        modelId: "acme-chat",
        visionCapability: "unknown",
        visionCapabilitySource: "inferred"
      }
    ])

    render(<ChatPage />)

    await waitForCustomModelsLoaded()

    const preventDefault = jest.fn()

    await act(async () => {
      latestInputAreaProps?.onSubmit?.({
        preventDefault
      } as unknown as React.FormEvent<HTMLFormElement>)
    })

    expect(handleSubmitMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        experimental_attachments: [
          expect.objectContaining({
            url: "data:image/png;base64,abc"
          })
        ]
      })
    )
    expect(screen.getByText("错误信息 无")).toBeInTheDocument()
    expect(preventDefault).not.toHaveBeenCalled()
  })

  it("should block image submit for a custom model inferred as text-only", async () => {
    useSessionStore.setState({
      sessions: [],
      currentSessionId: "session-1",
      currentModel: "custom:cfg-1",
      setSessions: useSessionStore.getState().setSessions,
      setCurrentSession: useSessionStore.getState().setCurrentSession,
      addSession: useSessionStore.getState().addSession,
      removeSession: useSessionStore.getState().removeSession,
      updateSessionTitle: useSessionStore.getState().updateSessionTitle,
      setModel: useSessionStore.getState().setModel
    })

    useChatStore.setState({
      ...useChatStore.getState(),
      images: ["data:image/png;base64,abc"]
    })

    mockCustomModelFetch([
      {
        id: "cfg-1",
        baseUrl: "https://open.bigmodel.cn/api/paas/v4",
        modelId: "glm-5.1",
        visionCapability: "unknown",
        visionCapabilitySource: "inferred"
      }
    ])

    render(<ChatPage />)

    await waitForCustomModelsLoaded()

    const preventDefault = jest.fn()

    await act(async () => {
      latestInputAreaProps?.onSubmit?.({
        preventDefault
      } as unknown as React.FormEvent<HTMLFormElement>)
    })

    expect(preventDefault).toHaveBeenCalled()
    expect(handleSubmitMock).not.toHaveBeenCalled()
    expect(
      screen.getByText("错误信息 当前模型不支持图片输入，请切换到支持多模态的模型后再发送")
    ).toBeInTheDocument()
  })

  it("should allow image submit for a custom model inferred as vision", async () => {
    useSessionStore.setState({
      sessions: [],
      currentSessionId: "session-1",
      currentModel: "custom:cfg-vision",
      setSessions: useSessionStore.getState().setSessions,
      setCurrentSession: useSessionStore.getState().setCurrentSession,
      addSession: useSessionStore.getState().addSession,
      removeSession: useSessionStore.getState().removeSession,
      updateSessionTitle: useSessionStore.getState().updateSessionTitle,
      setModel: useSessionStore.getState().setModel
    })

    useChatStore.setState({
      ...useChatStore.getState(),
      images: ["data:image/png;base64,abc"]
    })

    mockCustomModelFetch([
      {
        id: "cfg-vision",
        baseUrl: "https://open.bigmodel.cn/api/paas/v4",
        modelId: "glm-5v-turbo",
        visionCapability: "unknown",
        visionCapabilitySource: "inferred"
      }
    ])

    render(<ChatPage />)

    await waitForCustomModelsLoaded()

    const preventDefault = jest.fn()

    await act(async () => {
      latestInputAreaProps?.onSubmit?.({
        preventDefault
      } as unknown as React.FormEvent<HTMLFormElement>)
    })

    expect(handleSubmitMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        experimental_attachments: [
          expect.objectContaining({
            url: "data:image/png;base64,abc"
          })
        ]
      })
    )
    expect(screen.getByText("错误信息 无")).toBeInTheDocument()
    expect(preventDefault).not.toHaveBeenCalled()
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
})
