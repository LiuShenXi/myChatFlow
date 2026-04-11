import { fireEvent, render, screen } from "@testing-library/react"
import { SessionItem } from "@/components/session/SessionItem"
import type { ChatSession } from "@/types/chat"

function createSession(overrides: Partial<ChatSession> = {}): ChatSession {
  return {
    id: "session-1",
    title: "第一条会话",
    model: "gpt-4",
    createdAt: new Date("2026-04-12T00:00:00.000Z"),
    updatedAt: new Date("2026-04-12T00:00:00.000Z"),
    ...overrides
  }
}

describe("SessionItem", () => {
  it("should call onClick when selecting a session", () => {
    const onClick = jest.fn()

    render(
      <SessionItem
        session={createSession()}
        isActive={false}
        onClick={onClick}
        onDelete={jest.fn()}
        onRename={jest.fn()}
      />
    )

    fireEvent.click(screen.getByText("第一条会话"))

    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it("should rename a session with trimmed title", () => {
    const onRename = jest.fn()

    render(
      <SessionItem
        session={createSession()}
        isActive={false}
        onClick={jest.fn()}
        onDelete={jest.fn()}
        onRename={onRename}
      />
    )

    fireEvent.click(screen.getByRole("button", { name: "重命名会话" }))

    const input = screen.getByRole("textbox")
    fireEvent.change(input, { target: { value: "  已重命名会话  " } })
    fireEvent.click(screen.getByRole("button", { name: "确认重命名" }))

    expect(onRename).toHaveBeenCalledWith("已重命名会话")
  })

  it("should call onDelete without selecting the session", () => {
    const onClick = jest.fn()
    const onDelete = jest.fn()

    render(
      <SessionItem
        session={createSession()}
        isActive={false}
        onClick={onClick}
        onDelete={onDelete}
        onRename={jest.fn()}
      />
    )

    fireEvent.click(screen.getByRole("button", { name: "删除会话" }))

    expect(onDelete).toHaveBeenCalledTimes(1)
    expect(onClick).not.toHaveBeenCalled()
  })
})
