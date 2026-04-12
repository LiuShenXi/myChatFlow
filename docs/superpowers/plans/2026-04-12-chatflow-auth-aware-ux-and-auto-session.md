# ChatFlow Auth-Aware UX And Auto Session Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 保留页面不强制跳登录页的前提下，为未登录状态提供明确提示与登录入口，并在已登录但没有会话时自动创建会话，修复聊天输入框长期禁用的问题。

**Architecture:** 新增统一的轻量登录提示组件，让 Header、设置弹窗、会话抽屉和聊天主区都能在未登录时明确展示“当前不可用的原因”和 `/login` 入口。会话初始化逻辑集中在会话抽屉中，负责加载、选择第一条会话或自动创建首个会话。

**Tech Stack:** Next.js 15, React 19, TypeScript, Jest, Zustand, NextAuth

---

### Task 1: 引入统一登录提示组件并让 Header 暴露登录入口

**Files:**
- Create: `src/components/auth/AuthPrompt.tsx`
- Modify: `src/components/layout/Header.tsx`
- Test: `__tests__/components/layout/Header.test.tsx`

- [ ] **Step 1: 写失败测试**

```tsx
it("should render a login button when the user is not authenticated", () => {
  useSessionMock.mockReturnValue({ data: null, status: "unauthenticated" })

  render(<Header onOpenSettings={jest.fn()} />)

  expect(screen.getByRole("link", { name: "登录" })).toHaveAttribute(
    "href",
    "/login"
  )
})
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npm test -- --runInBand __tests__/components/layout/Header.test.tsx`
Expected: FAIL，提示“登录”入口不存在

- [ ] **Step 3: 实现统一提示组件与 Header 登录入口**

```tsx
export function AuthPrompt({ title, description }: AuthPromptProps) {
  return (
    <div className="rounded-xl border border-border bg-muted/40 p-4">
      <h3 className="text-sm font-medium">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      <a href="/login" className={buttonVariants({ size: "sm" })}>
        登录
      </a>
    </div>
  )
}
```

```tsx
{session?.user ? (
  <DropdownMenu>...</DropdownMenu>
) : (
  <a
    href="/login"
    className={buttonVariants({ variant: "outline", size: "sm" })}
  >
    登录
  </a>
)}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `npm test -- --runInBand __tests__/components/layout/Header.test.tsx`
Expected: PASS

### Task 2: 让设置弹窗在未登录时给出清晰提示

**Files:**
- Modify: `src/components/settings/SettingsDialog.tsx`
- Test: `__tests__/components/settings/SettingsDialog.test.tsx`

- [ ] **Step 1: 写失败测试**

```tsx
it("should show an auth prompt when unauthenticated", () => {
  useSessionMock.mockReturnValue({ data: null, status: "unauthenticated" })

  render(<SettingsDialog open={true} onOpenChange={jest.fn()} />)

  expect(screen.getByText("登录后才能配置 API Key")).toBeInTheDocument()
  expect(screen.getByRole("link", { name: "登录" })).toBeInTheDocument()
})
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npm test -- --runInBand __tests__/components/settings/SettingsDialog.test.tsx`
Expected: FAIL，未登录提示不存在

- [ ] **Step 3: 实现未登录分支**

```tsx
const { status } = useSession()

{status === "unauthenticated" ? (
  <AuthPrompt
    title="登录后才能配置 API Key"
    description="当前未登录，无法读取或保存你的模型密钥。"
  />
) : (
  <ApiKeyManager />
)}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `npm test -- --runInBand __tests__/components/settings/SettingsDialog.test.tsx`
Expected: PASS

### Task 3: 让会话抽屉负责自动选择或创建首个会话

**Files:**
- Modify: `src/components/session/SessionDrawer.tsx`
- Test: `__tests__/components/session/SessionDrawer.test.tsx`

- [ ] **Step 1: 写失败测试**

```tsx
it("should show an auth prompt instead of loading sessions when unauthenticated", () => {
  useSessionMock.mockReturnValue({ data: null, status: "unauthenticated" })

  render(<SessionDrawer />)

  expect(screen.getByText("登录后才能查看和创建会话")).toBeInTheDocument()
  expect(fetchMock).not.toHaveBeenCalled()
})

it("should auto-create the first session when the user has no sessions", async () => {
  useSessionMock.mockReturnValue({ data: { user: { id: "user-1" } }, status: "authenticated" })
  fetchMock
    .mockResolvedValueOnce({ ok: true, json: async () => [] })
    .mockResolvedValueOnce({
      ok: true,
      json: async () => createSession({ id: "session-auto", title: "新对话" })
    })

  render(<SessionDrawer />)

  await waitFor(() => {
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "/api/sessions",
      expect.objectContaining({ method: "POST" })
    )
  })
})
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npm test -- --runInBand __tests__/components/session/SessionDrawer.test.tsx`
Expected: FAIL，未登录提示不存在，自动创建逻辑未实现

- [ ] **Step 3: 实现会话初始化逻辑**

```tsx
if (status === "unauthenticated") {
  setSessions([])
  setCurrentSession(null)
  return
}

const response = await fetch("/api/sessions")
const data = await response.json()
setSessions(data)

if (data.length > 0) {
  setCurrentSession(data[0].id)
  return
}

const createResponse = await fetch("/api/sessions", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ model: currentModel })
})
```

- [ ] **Step 4: 运行测试确认通过**

Run: `npm test -- --runInBand __tests__/components/session/SessionDrawer.test.tsx`
Expected: PASS

### Task 4: 让聊天页明确展示未登录提示并等待自动会话完成

**Files:**
- Modify: `src/app/(chat)/page.tsx`
- Test: `__tests__/app/chat-page.test.tsx`

- [ ] **Step 1: 写失败测试**

```tsx
it("should show an auth prompt and keep input disabled when unauthenticated", () => {
  useSessionMock.mockReturnValue({ data: null, status: "unauthenticated" })

  render(<ChatPage />)

  expect(screen.getByText("登录后即可开始对话")).toBeInTheDocument()
  expect(screen.getByText("禁用状态 true")).toBeInTheDocument()
})
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npm test -- --runInBand __tests__/app/chat-page.test.tsx`
Expected: FAIL，未登录提示不存在

- [ ] **Step 3: 实现主区提示与禁用逻辑**

```tsx
const { status } = useSession()
const isUnauthenticated = status === "unauthenticated"
const inputDisabled =
  isLoading || status !== "authenticated" || !currentSessionId

return (
  <>
    {isUnauthenticated ? (
      <AuthPrompt
        title="登录后即可开始对话"
        description="当前未登录，无法创建会话、发送消息或保存 API Key。"
      />
    ) : null}
    <MessageList messages={messages} isLoading={isLoading} />
    <InputArea ... disabled={inputDisabled} />
  </>
)
```

- [ ] **Step 4: 运行测试确认通过**

Run: `npm test -- --runInBand __tests__/app/chat-page.test.tsx`
Expected: PASS

### Task 5: 运行全量验证

**Files:**
- Modify: `README.md`

- [ ] **Step 1: 更新 README 的登录与会话初始化说明**

```md
- 未登录时，页面会显示提示与登录入口
- 登录后若尚无会话，系统会自动创建第一条会话
```

- [ ] **Step 2: 运行相关测试集合**

Run: `npm test -- --runInBand __tests__/components/layout/Header.test.tsx __tests__/components/settings/SettingsDialog.test.tsx __tests__/components/session/SessionDrawer.test.tsx __tests__/app/chat-page.test.tsx`
Expected: PASS

- [ ] **Step 3: 运行完整本地验证**

Run: `npm run verify:local`
Expected: exit code 0，`tsc`、`jest`、`lint`、`build` 全部通过
