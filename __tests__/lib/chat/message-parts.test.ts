import {
  buildImageAttachments,
  extractImageUrls,
  mapStoredMessageToUiMessage,
  sanitizeMessagesForModelInput
} from "@/lib/chat/message-parts"
import { modelSupportsImageInput } from "@/types/model"

describe("message parts helpers", () => {
  it("should build ordered image attachments from base64 image urls", () => {
    const images = [
      "data:image/png;base64,abc",
      "data:image/jpeg;base64,def"
    ]

    expect(buildImageAttachments(images)).toEqual([
      {
        name: "image-1",
        contentType: "image/png",
        url: "data:image/png;base64,abc"
      },
      {
        name: "image-2",
        contentType: "image/jpeg",
        url: "data:image/jpeg;base64,def"
      }
    ])
  })

  it("should extract only image urls from experimental attachments", () => {
    const attachments = [
      {
        name: "image-1",
        contentType: "image/png",
        url: "data:image/png;base64,abc"
      },
      {
        name: "file-1",
        contentType: "application/pdf",
        url: "data:application/pdf;base64,xyz"
      },
      {
        name: "image-2",
        contentType: "image/jpeg",
        url: "data:image/jpeg;base64,def"
      }
    ]

    expect(extractImageUrls(attachments)).toEqual([
      "data:image/png;base64,abc",
      "data:image/jpeg;base64,def"
    ])
  })

  it("should map stored messages back to ui messages with image attachments", () => {
    expect(
      mapStoredMessageToUiMessage({
        id: "msg-1",
        role: "user",
        content: "hello",
        images: ["data:image/png;base64,abc"]
      })
    ).toEqual({
      id: "msg-1",
      role: "user",
      content: "hello",
      experimental_attachments: [
        {
          name: "image-1",
          contentType: "image/png",
          url: "data:image/png;base64,abc"
        }
      ]
    })
  })

  it("should remove assistant step-start parts before model input", () => {
    expect(
      sanitizeMessagesForModelInput([
        {
          id: "assistant-1",
          role: "assistant",
          content: "处理中",
          parts: [
            { type: "step-start" },
            { type: "text", text: "处理中" }
          ]
        }
      ])
    ).toEqual([
      {
        id: "assistant-1",
        role: "assistant",
        content: "处理中",
        parts: [{ type: "text", text: "处理中" }]
      }
    ])
  })

  it("should drop the parts field when assistant parts only contain step-start", () => {
    expect(
      sanitizeMessagesForModelInput([
        {
          id: "assistant-2",
          role: "assistant",
          content: "处理中",
          parts: [{ type: "step-start" }]
        }
      ])
    ).toEqual([
      {
        id: "assistant-2",
        role: "assistant",
        content: "处理中"
      }
    ])
  })

  it("should allow custom models to support image input", () => {
    expect(modelSupportsImageInput("custom:cfg-1")).toBe(true)
  })

  it("should allow built-in vision models to support image input", () => {
    expect(modelSupportsImageInput("gpt-4o")).toBe(true)
  })

  it("should support provider model ids for built-in vision models", () => {
    expect(modelSupportsImageInput("claude-3-5-sonnet-20241022")).toBe(true)
  })

  it("should keep qwen-plus as text only", () => {
    expect(modelSupportsImageInput("qwen-plus")).toBe(false)
  })
})
