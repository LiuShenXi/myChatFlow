import { create } from "zustand"

interface ChatStore {
  input: string
  setInput: (input: string) => void
  images: string[]
  addImage: (image: string) => void
  removeImage: (index: number) => void
  clearImages: () => void
  isStreaming: boolean
  setIsStreaming: (streaming: boolean) => void
}

export const useChatStore = create<ChatStore>((set) => ({
  input: "",
  setInput: (input) => set({ input }),
  images: [],
  addImage: (image) =>
    set((state) => ({
      images: [...state.images, image]
    })),
  removeImage: (index) =>
    set((state) => ({
      images: state.images.filter((_, currentIndex) => currentIndex !== index)
    })),
  clearImages: () => set({ images: [] }),
  isStreaming: false,
  setIsStreaming: (streaming) => set({ isStreaming: streaming })
}))
