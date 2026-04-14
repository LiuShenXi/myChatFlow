import { fireEvent, render, screen } from "@testing-library/react"
import { InputArea } from "@/components/chat/InputArea"
import { useChatStore } from "@/store/chat-store"

describe("InputArea", () => {
  beforeEach(() => {
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

  it("should render an error message when provided", () => {
    render(
      <InputArea
        input="看图"
        setInput={jest.fn()}
        onSubmit={jest.fn()}
        disabled={false}
        errorMessage="当前模型不支持图片输入，请切换到支持多模态的模型后再发送"
      />
    )

    expect(
      screen.getByText("当前模型不支持图片输入，请切换到支持多模态的模型后再发送")
    ).toBeInTheDocument()
  })

  it("should keep queued images when submit is prevented", () => {
    useChatStore.setState({
      ...useChatStore.getState(),
      images: ["data:image/png;base64,abc"]
    })

    render(
      <InputArea
        input="看图"
        setInput={jest.fn()}
        onSubmit={(event) => {
          event.preventDefault()
        }}
        disabled={false}
      />
    )

    const form = screen.getByRole("button", { name: "发送消息" }).closest("form")

    expect(form).not.toBeNull()

    fireEvent.submit(form!)

    expect(useChatStore.getState().images).toEqual(["data:image/png;base64,abc"])
  })

  it("should clear queued images after a successful submit even when the submit handler prevents default", () => {
    useChatStore.setState({
      ...useChatStore.getState(),
      images: ["data:image/png;base64,abc"]
    })

    render(
      <InputArea
        input="看图"
        setInput={jest.fn()}
        onSubmit={(event) => {
          event.preventDefault()
          return true
        }}
        disabled={false}
      />
    )

    const form = screen.getByRole("button", { name: "发送消息" }).closest("form")

    expect(form).not.toBeNull()

    fireEvent.submit(form!)

    expect(useChatStore.getState().images).toEqual([])
  })
})
