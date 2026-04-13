import { render, screen } from "@testing-library/react"

jest.mock("@/components/chat/MarkdownRenderer", () => ({
  MarkdownRenderer: ({ content }: { content: string }) => <div>{content}</div>
}))

import { MessageItem } from "@/components/chat/MessageItem"

describe("MessageItem", () => {
  it("should render uploaded image thumbnails for user messages", () => {
    render(
      <MessageItem
        message={{
          id: "message-1",
          role: "user",
          content: "看图",
          experimental_attachments: [
            {
              name: "image-1",
              contentType: "image/png",
              url: "data:image/png;base64,abc"
            }
          ]
        }}
      />
    )

    expect(screen.getByText("看图")).toBeInTheDocument()
    expect(screen.getByAltText("消息图片 1")).toBeInTheDocument()
  })
})
