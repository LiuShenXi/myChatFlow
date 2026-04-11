"use client"

import { useCallback } from "react"
import { useChatStore } from "@/store/chat-store"

export function useImageUpload() {
  const { addImage } = useChatStore()

  const compressAndConvert = useCallback(async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()

      reader.onerror = () => reject(new Error("Failed to read file"))
      reader.onload = (event) => {
        const image = new window.Image()

        image.onerror = () => reject(new Error("Failed to load image"))
        image.onload = () => {
          const canvas = document.createElement("canvas")
          const context = canvas.getContext("2d")

          if (!context) {
            reject(new Error("Failed to initialize canvas"))
            return
          }

          const maxSize = 1024
          let { width, height } = image

          if (width > height && width > maxSize) {
            height = (height * maxSize) / width
            width = maxSize
          } else if (height > maxSize) {
            width = (width * maxSize) / height
            height = maxSize
          }

          canvas.width = width
          canvas.height = height
          context.drawImage(image, 0, 0, width, height)

          resolve(canvas.toDataURL("image/jpeg", 0.8))
        }

        image.src = event.target?.result as string
      }

      reader.readAsDataURL(file)
    })
  }, [])

  const handleFiles = useCallback(
    async (files: FileList | File[]) => {
      const imageFiles = Array.from(files).filter((file) =>
        file.type.startsWith("image/")
      )

      for (const file of imageFiles) {
        const base64 = await compressAndConvert(file)
        addImage(base64)
      }
    },
    [addImage, compressAndConvert]
  )

  return { compressAndConvert, handleFiles }
}
