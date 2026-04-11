import { act, renderHook } from "@testing-library/react"
import { useImageUpload } from "@/hooks/useImageUpload"
import { useChatStore } from "@/store/chat-store"

describe("useImageUpload", () => {
  const originalCreateElement = document.createElement.bind(document)
  const originalFileReader = global.FileReader
  const originalImage = window.Image

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

    class MockFileReader {
      onload: ((event: { target: { result: string } }) => void) | null = null
      onerror: (() => void) | null = null

      readAsDataURL() {
        this.onload?.({
          target: {
            result: "data:image/png;base64,raw"
          }
        })
      }
    }

    class MockImage {
      width = 1600
      height = 800
      onload: (() => void) | null = null
      onerror: (() => void) | null = null

      set src(_value: string) {
        this.onload?.()
      }
    }

    Object.defineProperty(global, "FileReader", {
      writable: true,
      value: MockFileReader
    })

    Object.defineProperty(window, "Image", {
      writable: true,
      value: MockImage
    })

    jest
      .spyOn(document, "createElement")
      .mockImplementation((tagName: string) => {
        if (tagName === "canvas") {
          return {
            width: 0,
            height: 0,
            getContext: () => ({
              drawImage: jest.fn()
            }),
            toDataURL: () => "data:image/jpeg;base64,converted"
          } as unknown as HTMLCanvasElement
        }

        return originalCreateElement(tagName)
      })
  })

  afterEach(() => {
    jest.restoreAllMocks()

    Object.defineProperty(global, "FileReader", {
      writable: true,
      value: originalFileReader
    })

    Object.defineProperty(window, "Image", {
      writable: true,
      value: originalImage
    })
  })

  it("should convert image files and add them to the chat store", async () => {
    const imageFile = new File(["image"], "demo.png", { type: "image/png" })
    const textFile = new File(["text"], "notes.txt", { type: "text/plain" })
    const { result } = renderHook(() => useImageUpload())

    await act(async () => {
      await result.current.handleFiles([imageFile, textFile])
    })

    expect(useChatStore.getState().images).toEqual([
      "data:image/jpeg;base64,converted"
    ])
  })
})
