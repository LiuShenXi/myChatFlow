import { useChatStore } from "@/store/chat-store"

describe("chat-store", () => {
  beforeEach(() => {
    useChatStore.setState({
      input: "",
      images: [],
      isStreaming: false
    })
  })

  it("should set input", () => {
    useChatStore.getState().setInput("hello")

    expect(useChatStore.getState().input).toBe("hello")
  })

  it("should add an image", () => {
    useChatStore.getState().addImage("data:image/png;base64,abc")

    expect(useChatStore.getState().images).toHaveLength(1)
    expect(useChatStore.getState().images[0]).toBe("data:image/png;base64,abc")
  })

  it("should remove an image by index", () => {
    useChatStore.getState().addImage("img1")
    useChatStore.getState().addImage("img2")
    useChatStore.getState().addImage("img3")
    useChatStore.getState().removeImage(1)

    expect(useChatStore.getState().images).toEqual(["img1", "img3"])
  })

  it("should clear all images", () => {
    useChatStore.getState().addImage("img1")
    useChatStore.getState().addImage("img2")
    useChatStore.getState().clearImages()

    expect(useChatStore.getState().images).toEqual([])
  })

  it("should toggle streaming state", () => {
    useChatStore.getState().setIsStreaming(true)
    expect(useChatStore.getState().isStreaming).toBe(true)

    useChatStore.getState().setIsStreaming(false)
    expect(useChatStore.getState().isStreaming).toBe(false)
  })
})
