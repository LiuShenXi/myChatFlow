import { render, screen } from "@testing-library/react"

const mockMarkdownRenderer = jest.fn(({ content }: { content: string }) => (
  <span>{content}</span>
))

jest.mock("@/components/chat/MarkdownRenderer", () => ({
  MarkdownRenderer: ({ content }: { content: string }) =>
    mockMarkdownRenderer({ content })
}))

import { MessageItem } from "@/components/chat/MessageItem"

describe("MessageItem", () => {
  it("should render user text content and image thumbnails from experimental attachments", () => {
    render(
      <MessageItem
        message={{
          id: "message-1",
          role: "user",
          content: "hello world",
          experimental_attachments: [
            {
              name: "image-1",
              contentType: "image/png",
              url: "data:image/png;base64,abc"
            },
            {
              name: "file-1",
              contentType: "application/pdf",
              url: "data:application/pdf;base64,xyz"
            }
          ]
        }}
      />
    )

    expect(screen.getByText("hello world")).toBeInTheDocument()
    expect(
      screen.getByRole("img", { name: "消息图片 1" })
    ).toHaveAttribute("src", "data:image/png;base64,abc")
  })

  it("should keep assistant messages on markdown rendering only", () => {
    render(
      <MessageItem
        message={{
          id: "message-2",
          role: "assistant",
          content: "**bold text**"
        }}
      />
    )

    expect(mockMarkdownRenderer).toHaveBeenCalledWith({
      content: "**bold text**"
    })
    expect(screen.getByText("**bold text**")).toBeInTheDocument()
    expect(screen.queryByRole("img")).not.toBeInTheDocument()
  })
})
