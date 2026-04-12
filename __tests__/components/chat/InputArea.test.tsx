import * as React from "react"
import { fireEvent, render, screen } from "@testing-library/react"
import { InputArea } from "@/components/chat/InputArea"
import { useChatStore } from "@/store/chat-store"

const handleFilesMock = jest.fn()
const clearImagesMock = jest.fn()

jest.mock("@/hooks/useImageUpload", () => ({
  useImageUpload: () => ({
    handleFiles: handleFilesMock
  })
}))

describe("InputArea", () => {
  const setInputMock = jest.fn()
  const onSubmitMock = jest.fn()
  const removeImageMock = jest.fn()
  const setIsStreamingMock = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    onSubmitMock.mockReset()

    useChatStore.setState({
      input: "",
      images: ["data:image/png;base64,abc"],
      isStreaming: false,
      setInput: useChatStore.getState().setInput,
      addImage: useChatStore.getState().addImage,
      removeImage: removeImageMock,
      clearImages: clearImagesMock,
      setIsStreaming: setIsStreamingMock
    })
  })

  it("clears images when onSubmit returns true even if it prevents default", () => {
    onSubmitMock.mockImplementation((event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault()
      return true
    })

    const { container } = render(
      <InputArea
        input="hello"
        setInput={setInputMock}
        onSubmit={onSubmitMock}
        disabled={false}
      />
    )

    fireEvent.submit(container.querySelector("form") as HTMLFormElement)

    expect(onSubmitMock).toHaveBeenCalled()
    expect(clearImagesMock).toHaveBeenCalledTimes(1)
  })

  it("keeps images when onSubmit returns false", () => {
    onSubmitMock.mockReturnValue(false)

    const { container } = render(
      <InputArea
        input="hello"
        setInput={setInputMock}
        onSubmit={onSubmitMock}
        disabled={false}
      />
    )

    fireEvent.submit(container.querySelector("form") as HTMLFormElement)

    expect(onSubmitMock).toHaveBeenCalled()
    expect(clearImagesMock).not.toHaveBeenCalled()
  })

  it("shows the submit error message above the previews", () => {
    render(
      <InputArea
        input="hello"
        setInput={setInputMock}
        onSubmit={onSubmitMock}
        disabled={false}
        errorMessage="当前模型不支持图片输入，请切换到支持多模态的模型后再发送"
      />
    )

    expect(
      screen.getByText(
        "当前模型不支持图片输入，请切换到支持多模态的模型后再发送"
      )
    ).toBeInTheDocument()
    expect(screen.getByAltText("上传图片 1")).toBeInTheDocument()
  })
})
