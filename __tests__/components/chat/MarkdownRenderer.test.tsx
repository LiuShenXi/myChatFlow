import React from "react"
import { render, screen } from "@testing-library/react"

jest.mock("remark-math", () => ({
  __esModule: true,
  default: () => undefined
}))

jest.mock("rehype-katex", () => ({
  __esModule: true,
  default: () => undefined
}))

jest.mock("react-syntax-highlighter", () => ({
  Prism: ({
    children
  }: {
    children: React.ReactNode
  }) => <code>{children}</code>
}))

jest.mock("react-syntax-highlighter/dist/esm/styles/prism", () => ({
  oneDark: {}
}))

jest.mock("react-markdown", () => ({
  __esModule: true,
  default: ({
    children,
    components
  }: {
    children: string
    components: {
      code: (props: {
        className?: string
        children: React.ReactNode
      }) => React.ReactElement
      a: (props: {
        href?: string
        children: React.ReactNode
      }) => React.ReactElement
    }
  }) => {
    const source = String(children)
    const linkMatch = /^\[(.+)\]\((.+)\)$/.exec(source)
    const codeBlockMatch = /^```(\w+)\n([\s\S]+)\n```$/.exec(source)
    const inlineCodeMatch = /^Use `(.+)`$/.exec(source)
    const boldMatch = /^\*\*(.+)\*\*$/.exec(source)

    if (linkMatch) {
      return components.a({
        href: linkMatch[2],
        children: linkMatch[1]
      })
    }

    if (codeBlockMatch) {
      return components.code({
        className: `language-${codeBlockMatch[1]}`,
        children: codeBlockMatch[2]
      })
    }

    if (inlineCodeMatch) {
      return (
        <p>
          Use{" "}
          {components.code({
            children: inlineCodeMatch[1]
          })}
        </p>
      )
    }

    if (boldMatch) {
      return <strong>{boldMatch[1]}</strong>
    }

    return <p>{source}</p>
  }
}))

import { MarkdownRenderer } from "@/components/chat/MarkdownRenderer"

describe("MarkdownRenderer", () => {
  it("should render plain text", () => {
    render(<MarkdownRenderer content="Hello world" />)

    expect(screen.getByText("Hello world")).toBeInTheDocument()
  })

  it("should render bold text", () => {
    render(<MarkdownRenderer content="**bold text**" />)

    expect(screen.getByText("bold text")).toBeInTheDocument()
  })

  it("should render inline code", () => {
    render(<MarkdownRenderer content="Use `console.log`" />)

    expect(screen.getByText("console.log")).toBeInTheDocument()
  })

  it("should render code blocks with a code element", () => {
    const code = '```javascript\nconsole.log("hello")\n```'
    const { container } = render(<MarkdownRenderer content={code} />)

    expect(container.querySelector("code")).toBeInTheDocument()
  })

  it("should render links", () => {
    render(<MarkdownRenderer content="[example](https://example.com)" />)

    const link = screen.getByText("example")

    expect(link).toBeInTheDocument()
    expect(link.closest("a")).toHaveAttribute("href", "https://example.com")
  })
})
