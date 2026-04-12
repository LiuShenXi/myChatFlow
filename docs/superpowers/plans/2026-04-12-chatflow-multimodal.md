# ChatFlow Multimodal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 打通 ChatFlow 的图片多模态闭环，让支持视觉的内置模型和默认放行的自定义模型都能稳定处理“文本 + 图片”输入，并补齐历史回显与能力提示。

**Architecture:** 保持数据库 `Message.content + Message.images[]` 不变，复用 AI SDK 的 `experimental_attachments` 作为前后端传输结构，在 `src/lib/chat/message-parts.ts` 中集中做图片附件构造、历史消息映射、模型能力判断和图片提取。聊天页负责在提交边界组装图片消息，`/api/chat` 负责能力校验和持久化，渲染层负责回显图片和视觉能力提示。

**Tech Stack:** Next.js 15, React 19, TypeScript, AI SDK 4, Jest, Testing Library, Zustand

---

## File Structure

- Create: `src/lib/chat/message-parts.ts`
- Create: `__tests__/lib/chat/message-parts.test.ts`
- Modify: `src/types/model.ts`
- Modify: `src/app/api/chat/route.ts`
- Modify: `__tests__/app/api/chat/route.test.ts`
- Modify: `src/app/(chat)/page.tsx`
- Modify: `__tests__/app/chat-page.test.tsx`
- Modify: `src/components/chat/InputArea.tsx`
- Create: `__tests__/components/chat/InputArea.test.tsx`
- Modify: `src/components/chat/MessageItem.tsx`
- Create: `__tests__/components/chat/MessageItem.test.tsx`
- Modify: `src/components/settings/ModelSelector.tsx`
- Modify: `__tests__/components/settings/ModelSelector.test.tsx`

### Task 1: 先用测试定义多模态辅助层契约

**Files:**
- Create: `__tests__/lib/chat/message-parts.test.ts`
- Create: `src/lib/chat/message-parts.ts`
- Modify: `src/types/model.ts`

- [ ] **Step 1: 先为图片附件构造、图片提取和模型能力判断写失败测试**

```ts
import {
  buildImageAttachments,
  extractImageUrls,
  mapStoredMessageToUiMessage
} from "@/lib/chat/message-parts"
import { modelSupportsImageInput } from "@/types/model"

describe("message-parts helpers", () => {
  it("should convert base64 images to AI SDK attachments", () => {
    expect(
      buildImageAttachments(["data:image/png;base64,abc", "data:image/jpeg;base64,def"])
    ).toEqual([
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

  it("should extract image urls from experimental attachments", () => {
    expect(
      extractImageUrls([
        { name: "image-1", contentType: "image/png", url: "data:image/png;base64,abc" },
        { name: "notes", contentType: "text/plain", url: "data:text/plain;base64,xyz" }
      ])
    ).toEqual(["data:image/png;base64,abc"])
  })

  it("should map stored images back to ui messages", () => {
    expect(
      mapStoredMessageToUiMessage({
        id: "message-1",
        role: "user",
        content: "帮我看看这张图",
        images: ["data:image/png;base64,abc"]
      })
    ).toEqual(
      expect.objectContaining({
        id: "message-1",
        role: "user",
        content: "帮我看看这张图",
        experimental_attachments: [
          {
            name: "image-1",
            contentType: "image/png",
            url: "data:image/png;base64,abc"
          }
        ]
      })
    )
  })

  it("should treat custom models as image-capable by default", () => {
    expect(modelSupportsImageInput("custom:cfg-1")).toBe(true)
  })

  it("should reject image input for non-vision built-in models", () => {
    expect(modelSupportsImageInput("qwen-plus")).toBe(false)
  })
})
```

- [ ] **Step 2: 运行 helper 定向测试并确认先失败**

Run: `npm test -- --runInBand __tests__/lib/chat/message-parts.test.ts`
Expected: FAIL，提示 `message-parts` 模块或 `modelSupportsImageInput` 尚不存在

- [ ] **Step 3: 用最小实现补齐 helper 和模型能力方法**

```ts
import type { Attachment, Message } from "ai"

export function buildImageAttachments(images: string[]): Attachment[] {
  return images.map((url, index) => ({
    name: `image-${index + 1}`,
    contentType: url.match(/^data:(.*?);base64,/)?.[1] ?? "image/jpeg",
    url
  }))
}

export function extractImageUrls(
  attachments: Attachment[] | undefined
): string[] {
  return (attachments ?? [])
    .filter((attachment) => attachment.contentType?.startsWith("image/"))
    .map((attachment) => attachment.url)
}

export function mapStoredMessageToUiMessage(message: {
  id: string
  role: "user" | "assistant" | "system"
  content: string
  images?: string[]
}): Message {
  const imageAttachments = buildImageAttachments(message.images ?? [])

  return {
    id: message.id,
    role: message.role,
    content: message.content,
    ...(imageAttachments.length > 0
      ? { experimental_attachments: imageAttachments }
      : {})
  }
}
```

```ts
import { getModelConfig, isCustomModelId } from "@/types/model"

export function modelSupportsImageInput(modelId: string) {
  if (isCustomModelId(modelId)) {
    return true
  }

  return getModelConfig(modelId)?.supportsVision ?? false
}
```

- [ ] **Step 4: 运行 helper 定向测试确认通过**

Run: `npm test -- --runInBand __tests__/lib/chat/message-parts.test.ts`
Expected: PASS

- [ ] **Step 5: 提交 helper 基础设施**

```bash
git add src/lib/chat/message-parts.ts src/types/model.ts __tests__/lib/chat/message-parts.test.ts
git commit -m "test: define multimodal message helper contracts"
```

### Task 2: 用 TDD 打通 `/api/chat` 的图片能力校验与持久化

**Files:**
- Modify: `__tests__/app/api/chat/route.test.ts`
- Modify: `src/app/api/chat/route.ts`

- [ ] **Step 1: 为带图请求的后端行为补失败测试**

```ts
it("should reject image input for a non-vision built-in model", async () => {
  authMock.mockResolvedValue({ user: { id: "user-1" } })
  findUniqueMock.mockResolvedValue({ encryptedKey: "encrypted-value" })

  const response = await POST(
    new Request("http://localhost/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId: "session-1",
        model: "qwen-plus",
        messages: [
          {
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
          }
        ]
      })
    })
  )

  expect(response.status).toBe(400)
  await expect(response.json()).resolves.toEqual({
    error: "当前模型不支持图片输入，请切换到支持多模态的模型后再发送"
  })
})

it("should pass image attachments through to streamText for a vision model", async () => {
  authMock.mockResolvedValue({ user: { id: "user-1" } })
  findUniqueMock.mockResolvedValue({ encryptedKey: "encrypted-value" })
  decryptMock.mockReturnValue("decrypted-value")
  getProviderMock.mockReturnValue({ provider: "openai-model" })
  streamTextMock.mockResolvedValue({
    toDataStreamResponse: () => new Response("stream-ok", { status: 200 })
  })

  await POST(
    new Request("http://localhost/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId: "session-1",
        model: "gpt-4o",
        messages: [
          {
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
          }
        ]
      })
    })
  )

  expect(streamTextMock).toHaveBeenCalledWith(
    expect.objectContaining({
      messages: [
        expect.objectContaining({
          experimental_attachments: [
            expect.objectContaining({
              url: "data:image/png;base64,abc"
            })
          ]
        })
      ]
    })
  )
})

it("should persist image urls extracted from attachments", async () => {
  authMock.mockResolvedValue({ user: { id: "user-1" } })
  findUniqueMock.mockResolvedValue({ encryptedKey: "encrypted-value" })
  decryptMock.mockReturnValue("decrypted-value")
  getProviderMock.mockReturnValue({ provider: "openai-model" })
  streamTextMock.mockImplementation(async ({ onFinish }) => {
    await onFinish({
      text: "助手回复",
      usage: { totalTokens: 42 }
    })

    return {
      toDataStreamResponse: () => new Response("stream-ok", { status: 200 })
    }
  })

  await POST(
    new Request("http://localhost/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId: "session-1",
        model: "gpt-4o",
        messages: [
          {
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
          }
        ]
      })
    })
  )

  expect(messageCreateMock).toHaveBeenCalledWith(
    expect.objectContaining({
      data: expect.objectContaining({
        content: "看图",
        images: ["data:image/png;base64,abc"]
      })
    })
  )
})
```

- [ ] **Step 2: 运行 API 路由测试并确认先失败**

Run: `npm test -- --runInBand __tests__/app/api/chat/route.test.ts`
Expected: FAIL，原因是当前 route 既不会拦截非视觉模型带图，也不会从 `experimental_attachments` 中提取图片

- [ ] **Step 3: 最小修改 `/api/chat` 实现能力校验与图片提取**

```ts
import type { Attachment, Message } from "ai"
import {
  extractImageUrls
} from "@/lib/chat/message-parts"
import { modelSupportsImageInput } from "@/types/model"

type IncomingMessage = Message & {
  experimental_attachments?: Attachment[]
}

const lastUserMessage = messages[messages.length - 1]
const lastUserImages = extractImageUrls(lastUserMessage?.experimental_attachments)

if (lastUserImages.length > 0 && !modelSupportsImageInput(modelId)) {
  return new Response(
    JSON.stringify({
      error: "当前模型不支持图片输入，请切换到支持多模态的模型后再发送"
    }),
    {
      status: 400,
      headers: { "Content-Type": "application/json" }
    }
  )
}

const result = await streamText({
  model: provider,
  messages: messages as never,
  onFinish: async ({ text, usage }) => {
    if (lastUserMessage?.role === "user") {
      await prisma.message.create({
        data: {
          sessionId,
          role: "user",
          content: lastUserMessage.content,
          images: lastUserImages
        }
      })
    }
```

- [ ] **Step 4: 运行 API 路由测试确认通过**

Run: `npm test -- --runInBand __tests__/app/api/chat/route.test.ts`
Expected: PASS

- [ ] **Step 5: 提交后端多模态链路**

```bash
git add src/app/api/chat/route.ts __tests__/app/api/chat/route.test.ts
git commit -m "feat: validate multimodal chat inputs"
```

### Task 3: 用 TDD 打通聊天页提交与历史消息映射

**Files:**
- Modify: `__tests__/app/chat-page.test.tsx`
- Modify: `src/app/(chat)/page.tsx`
- Modify: `src/components/chat/InputArea.tsx`
- Create: `__tests__/components/chat/InputArea.test.tsx`

- [ ] **Step 1: 为聊天页的图片提交、历史回显映射和失败保留图片写失败测试**

```ts
it("should submit chat images as experimental attachments", async () => {
  useSessionStore.setState({
    sessions: [],
    currentSessionId: "session-1",
    currentModel: "gpt-4o",
    setSessions: useSessionStore.getState().setSessions,
    setCurrentSession: useSessionStore.getState().setCurrentSession,
    addSession: useSessionStore.getState().addSession,
    removeSession: useSessionStore.getState().removeSession,
    updateSessionTitle: useSessionStore.getState().updateSessionTitle,
    setModel: useSessionStore.getState().setModel
  })

  useChatStore.setState({
    ...useChatStore.getState(),
    images: ["data:image/png;base64,abc"]
  })

  let latestOnSubmit:
    | ((event: React.FormEvent<HTMLFormElement>) => void)
    | undefined

  render(<ChatPage />)

  latestOnSubmit?.({
    preventDefault: jest.fn()
  } as unknown as React.FormEvent<HTMLFormElement>)

  expect(handleSubmitMock).toHaveBeenCalledWith(
    expect.anything(),
    expect.objectContaining({
      experimental_attachments: [
        expect.objectContaining({ url: "data:image/png;base64,abc" })
      ]
    })
  )
})

it("should map stored images back to experimental attachments when loading history", async () => {
  useSessionStore.setState({
    sessions: [],
    currentSessionId: "session-1",
    currentModel: "gpt-4o",
    setSessions: useSessionStore.getState().setSessions,
    setCurrentSession: useSessionStore.getState().setCurrentSession,
    addSession: useSessionStore.getState().addSession,
    removeSession: useSessionStore.getState().removeSession,
    updateSessionTitle: useSessionStore.getState().updateSessionTitle,
    setModel: useSessionStore.getState().setModel
  })

  fetchMock.mockResolvedValueOnce({
    ok: true,
    json: async () => ({
      messages: [
        {
          id: "message-1",
          role: "user",
          content: "看图",
          images: ["data:image/png;base64,abc"]
        }
      ]
    })
  })

  render(<ChatPage />)

  await waitFor(() => {
    expect(setMessagesMock).toHaveBeenCalledWith([
      expect.objectContaining({
        experimental_attachments: [
          expect.objectContaining({ url: "data:image/png;base64,abc" })
        ]
      })
    ])
  })
})

it("should keep queued images when submit is prevented", () => {
  const preventDefault = jest.fn()

  useChatStore.setState({
    ...useChatStore.getState(),
    images: ["data:image/png;base64,abc"]
  })

  render(
    <InputArea
      input="看图"
      setInput={jest.fn()}
      onSubmit={(event) => {
        event.preventDefault()
      }}
      disabled={false}
    />
  )

  fireEvent.submit(screen.getByRole("button", { name: "发送消息" }).closest("form")!)

  expect(useChatStore.getState().images).toEqual(["data:image/png;base64,abc"])
  expect(preventDefault).not.toHaveBeenCalled()
})
```

```ts
jest.mock("@/components/chat/InputArea", () => {
  const MockInputArea = React.forwardRef<
    HTMLTextAreaElement,
    {
      input: string
      disabled: boolean
      onSubmit?: (event: React.FormEvent<HTMLFormElement>) => void
    }
  >(function MockInputArea({ input, disabled, onSubmit }, ref) {
    latestOnSubmit = onSubmit

    React.useImperativeHandle(
      ref,
      () =>
        ({
          focus: mockFocus
        }) as unknown as HTMLTextAreaElement
    )

    return (
      <div>
        <div>输入框 {input}</div>
        <div>禁用状态 {String(disabled)}</div>
      </div>
    )
  })

  return {
    InputArea: MockInputArea
  }
})
```

- [ ] **Step 2: 运行聊天页和 InputArea 定向测试并确认先失败**

Run: `npm test -- --runInBand __tests__/app/chat-page.test.tsx __tests__/components/chat/InputArea.test.tsx`
Expected: FAIL，原因是当前页面不会把图片注入 `handleSubmit`，历史加载也不会映射 `experimental_attachments`

- [ ] **Step 3: 最小修改聊天页与输入区**

```ts
import { buildImageAttachments, mapStoredMessageToUiMessage } from "@/lib/chat/message-parts"
import { modelSupportsImageInput } from "@/types/model"

const images = useChatStore((state) => state.images)
const [submitError, setSubmitError] = useState<string | null>(null)

const {
  messages,
  input,
  setInput,
  handleSubmit,
  isLoading,
  setMessages
} = useChat({
  api: "/api/chat",
  body: {
    sessionId: currentSessionId,
    model: currentModel
  }
})

const handleChatSubmit = (event: FormEvent<HTMLFormElement>) => {
  if (images.length > 0 && !modelSupportsImageInput(currentModel)) {
    event.preventDefault()
    setSubmitError("当前模型不支持图片输入，请切换到支持多模态的模型后再发送")
    return
  }

  setSubmitError(null)
  handleSubmit(event, {
    experimental_attachments: buildImageAttachments(images)
  })
}

setMessages(data.messages.map(mapStoredMessageToUiMessage))
```

```tsx
<InputArea
  ref={inputRef}
  input={input}
  setInput={setInput}
  onSubmit={handleChatSubmit}
  disabled={isInputDisabled}
  errorMessage={submitError}
/>
```

```tsx
interface InputAreaProps {
  input: string
  setInput: (input: string) => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  disabled: boolean
  errorMessage?: string | null
}

{errorMessage ? (
  <p className="mb-3 text-sm text-destructive">{errorMessage}</p>
) : null}
```

- [ ] **Step 4: 运行聊天页与 InputArea 测试确认通过**

Run: `npm test -- --runInBand __tests__/app/chat-page.test.tsx __tests__/components/chat/InputArea.test.tsx`
Expected: PASS

- [ ] **Step 5: 提交前端提交闭环**

```bash
git add src/app/\(chat\)/page.tsx src/components/chat/InputArea.tsx __tests__/app/chat-page.test.tsx __tests__/components/chat/InputArea.test.tsx
git commit -m "feat: submit multimodal chat messages from the UI"
```

### Task 4: 用 TDD 补齐图片回显和视觉能力提示

**Files:**
- Modify: `src/components/chat/MessageItem.tsx`
- Create: `__tests__/components/chat/MessageItem.test.tsx`
- Modify: `src/components/settings/ModelSelector.tsx`
- Modify: `__tests__/components/settings/ModelSelector.test.tsx`

- [ ] **Step 1: 为消息渲染和模型选择器提示写失败测试**

```ts
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

it("should label built-in vision models in the selector", async () => {
  render(<ModelSelector />)

  await waitFor(() => expect(fetchMock).toHaveBeenCalled())

  expect(screen.getByRole("button", { name: "GPT-4 视觉" })).toBeInTheDocument()
  expect(screen.getByRole("button", { name: "GPT-4o 视觉" })).toBeInTheDocument()
  expect(screen.getByRole("button", { name: "Claude 3.5 Sonnet 视觉" })).toBeInTheDocument()
  expect(screen.getByRole("button", { name: "Qwen Plus" })).toBeInTheDocument()
})
```

- [ ] **Step 2: 运行渲染与模型选择器测试并确认先失败**

Run: `npm test -- --runInBand __tests__/components/chat/MessageItem.test.tsx __tests__/components/settings/ModelSelector.test.tsx`
Expected: FAIL，原因是当前消息组件不会渲染附件图片，模型选择器也没有视觉标签

- [ ] **Step 3: 最小修改消息渲染和模型选择器**

```ts
import { extractImageUrls } from "@/lib/chat/message-parts"

const imageUrls = extractImageUrls(message.experimental_attachments)

{imageUrls.length > 0 ? (
  <div className="mt-2 flex flex-wrap gap-2">
    {imageUrls.map((url, index) => (
      <img
        key={`${url.slice(0, 32)}-${index}`}
        src={url}
        alt={`消息图片 ${index + 1}`}
        className="h-24 w-24 rounded-md object-cover"
      />
    ))}
  </div>
) : null}
```

```ts
const renderModelLabel = (model: { name: string; supportsVision?: boolean }) =>
  model.supportsVision ? `${model.name} 视觉` : model.name

{AVAILABLE_MODELS.map((model) => (
  <DropdownMenuItem key={model.id} onClick={() => setModel(model.id)}>
    {renderModelLabel(model)}
  </DropdownMenuItem>
))}
```

- [ ] **Step 4: 运行渲染与模型选择器测试确认通过**

Run: `npm test -- --runInBand __tests__/components/chat/MessageItem.test.tsx __tests__/components/settings/ModelSelector.test.tsx`
Expected: PASS

- [ ] **Step 5: 提交图片回显与视觉提示**

```bash
git add src/components/chat/MessageItem.tsx src/components/settings/ModelSelector.tsx __tests__/components/chat/MessageItem.test.tsx __tests__/components/settings/ModelSelector.test.tsx
git commit -m "feat: render multimodal chat images in the UI"
```

### Task 5: 做回归验证并收尾

**Files:**
- Modify: `src/lib/chat/message-parts.ts`
- Modify: `src/app/api/chat/route.ts`
- Modify: `src/app/(chat)/page.tsx`
- Modify: `src/components/chat/InputArea.tsx`
- Modify: `src/components/chat/MessageItem.tsx`
- Modify: `src/components/settings/ModelSelector.tsx`

- [ ] **Step 1: 运行多模态相关定向测试**

Run: `npm test -- --runInBand __tests__/lib/chat/message-parts.test.ts __tests__/app/api/chat/route.test.ts __tests__/app/chat-page.test.tsx __tests__/components/chat/InputArea.test.tsx __tests__/components/chat/MessageItem.test.tsx __tests__/components/settings/ModelSelector.test.tsx`
Expected: PASS

- [ ] **Step 2: 运行全量测试**

Run: `npm test -- --runInBand`
Expected: PASS

- [ ] **Step 3: 运行本地整体验证**

Run: `npm run verify:local`
Expected: PASS

- [ ] **Step 4: 提交最终实现**

```bash
git add src/types/model.ts src/lib/chat/message-parts.ts src/app/api/chat/route.ts src/app/\(chat\)/page.tsx src/components/chat/InputArea.tsx src/components/chat/MessageItem.tsx src/components/settings/ModelSelector.tsx __tests__/lib/chat/message-parts.test.ts __tests__/app/api/chat/route.test.ts __tests__/app/chat-page.test.tsx __tests__/components/chat/InputArea.test.tsx __tests__/components/chat/MessageItem.test.tsx __tests__/components/settings/ModelSelector.test.tsx docs/superpowers/plans/2026-04-12-chatflow-multimodal.md
git commit -m "feat: add multimodal image chat support"
```
