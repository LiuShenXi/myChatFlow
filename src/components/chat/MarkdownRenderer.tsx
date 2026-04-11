import { memo } from "react"
import ReactMarkdown from "react-markdown"
import rehypeKatex from "rehype-katex"
import remarkMath from "remark-math"
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter"
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism"

interface MarkdownRendererProps {
  content: string
}

export const MarkdownRenderer = memo(function MarkdownRenderer({
  content
}: MarkdownRendererProps) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkMath]}
      rehypePlugins={[rehypeKatex]}
      components={{
        code({ className, children, ...props }) {
          const match = /language-(\w+)/.exec(className || "")
          const text = String(children).replace(/\n$/, "")

          if (match) {
            return (
              <SyntaxHighlighter
                language={match[1]}
                style={oneDark}
                PreTag="div"
              >
                {text}
              </SyntaxHighlighter>
            )
          }

          return (
            <code
              className="rounded bg-muted px-1.5 py-0.5 text-sm"
              {...props}
            >
              {children}
            </code>
          )
        },
        a({ children, ...props }) {
          return (
            <a
              className="text-primary underline underline-offset-4"
              target="_blank"
              rel="noreferrer"
              {...props}
            >
              {children}
            </a>
          )
        }
      }}
    >
      {content}
    </ReactMarkdown>
  )
})
