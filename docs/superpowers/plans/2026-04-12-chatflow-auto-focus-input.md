# ChatFlow Auto Focus Input Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为 ChatFlow 聊天页补上登录后、刷新后、切换会话后的输入框自动聚焦能力，并避免抢走用户正在其他输入控件中的焦点。

**Architecture:** 采用页面级聚焦协调器方案，由聊天页统一判断“重新进入可输入状态”的时机，并通过暴露自 `InputArea` 的 `textarea` ref 执行 `focus()`。`InputArea` 只负责输入与 ref 暴露，不承担聚焦策略；测试重点落在聊天页行为上。

**Tech Stack:** Next.js 15, React 19, TypeScript, Jest, Testing Library, NextAuth, Zustand

---

## File Structure

- Create: `docs/superpowers/plans/2026-04-12-chatflow-auto-focus-input.md`
- Modify: `src/components/chat/InputArea.tsx`
- Modify: `src/app/(chat)/page.tsx`
- Modify: `__tests__/app/chat-page.test.tsx`

### Task 1: 让 InputArea 暴露可聚焦的 textarea 引用

**Files:**
- Modify: `src/components/chat/InputArea.tsx`

- [ ] **Step 1: 先把 InputArea 改成可接收外部 ref**

```tsx
import { forwardRef, useEffect, useRef } from "react"

export const InputArea = forwardRef<HTMLTextAreaElement, InputAreaProps>(
  function InputArea(
    {
      input,
      setInput,
      onSubmit,
      disabled
    },
    forwardedRef
  ) {
```

- [ ] **Step 2: 增加一个本地 textareaRef，并把本地 ref 同步给外部 ref**

```tsx
const textareaRef = useRef<HTMLTextAreaElement>(null)

const setTextareaRef = (node: HTMLTextAreaElement | null) => {
  textareaRef.current = node

  if (typeof forwardedRef === "function") {
    forwardedRef(node)
    return
  }

  if (forwardedRef) {
    forwardedRef.current = node
  }
}
```

- [ ] **Step 3: 把 Textarea 的 ref 改为同步函数，并保持现有自适应高度逻辑不变**

```tsx
<Textarea
  ref={setTextareaRef}
  value={input}
  rows={1}
  disabled={disabled}
  placeholder="输入消息... (Shift+Enter 换行)"
  className="max-h-[200px] min-h-[40px] flex-1 resize-none"
  onChange={(event) => setInput(event.target.value)}
  onPaste={(event) => {
    void handlePaste(event)
  }}
  onKeyDown={handleKeyDown}
/>
```

- [ ] **Step 4: 确认组件导出仍兼容现有调用**

```tsx
InputArea.displayName = "InputArea"
```

### Task 2: 在聊天页实现页面级自动聚焦协调器

**Files:**
- Modify: `src/app/(chat)/page.tsx`

- [ ] **Step 1: 为聊天页增加输入框 ref 与上一次状态记录**

```tsx
import { useEffect, useRef } from "react"

const inputRef = useRef<HTMLTextAreaElement>(null)
const previousFocusableRef = useRef(false)
const previousSessionIdRef = useRef<string | null>(null)
```

- [ ] **Step 2: 提炼“当前是否可输入”和“当前是否存在其他输入型焦点”的判断**

```tsx
const isInputDisabled =
  isLoading || status !== "authenticated" || !currentSessionId

const hasInputLikeFocus = () => {
  if (typeof document === "undefined") {
    return false
  }

  const activeElement = document.activeElement

  if (!(activeElement instanceof HTMLElement)) {
    return false
  }

  const tagName = activeElement.tagName.toLowerCase()
  return (
    tagName === "input" ||
    tagName === "textarea" ||
    tagName === "select" ||
    activeElement.isContentEditable
  )
}
```

- [ ] **Step 3: 新增聚焦 effect，只在“进入可输入状态”或“会话切换后重新可输入”时尝试聚焦**

```tsx
useEffect(() => {
  const isFocusable =
    status === "authenticated" && Boolean(currentSessionId) && !isLoading

  const sessionChanged = previousSessionIdRef.current !== currentSessionId
  const becameFocusable = !previousFocusableRef.current && isFocusable

  if (isFocusable && (becameFocusable || sessionChanged) && !hasInputLikeFocus()) {
    inputRef.current?.focus()
  }

  previousFocusableRef.current = isFocusable
  previousSessionIdRef.current = currentSessionId
}, [currentSessionId, isLoading, status])
```

- [ ] **Step 4: 把 ref 传给 InputArea，并保持现有未登录提示、消息加载、streaming 同步逻辑不变**

```tsx
<InputArea
  ref={inputRef}
  input={input}
  setInput={setInput}
  onSubmit={handleSubmit}
  disabled={isInputDisabled}
/>
```

### Task 3: 用聊天页测试覆盖自动聚焦与防打扰规则

**Files:**
- Modify: `__tests__/app/chat-page.test.tsx`

- [ ] **Step 1: 先把 InputArea mock 改成可观测 ref 行为**

```tsx
const focusSpy = jest.fn()

jest.mock("@/components/chat/InputArea", () => {
  const React = require("react")

  return {
    InputArea: React.forwardRef(
      (
        {
          input,
          disabled
        }: {
          input: string
          disabled: boolean
        },
        ref: React.Ref<HTMLTextAreaElement>
      ) => {
        const textarea = {
          focus: focusSpy
        } as unknown as HTMLTextAreaElement

        React.useImperativeHandle(ref, () => textarea)

        return (
          <div>
            <div>输入框 {input}</div>
            <div>禁用状态 {String(disabled)}</div>
          </div>
        )
      }
    )
  }
})
```

- [ ] **Step 2: 增加“进入可输入状态时会聚焦”的测试**

```tsx
it("should focus the input when the page becomes ready for chatting", async () => {
  useSessionStore.setState({
    ...useSessionStore.getState(),
    currentSessionId: "session-1"
  })

  fetchMock.mockResolvedValueOnce({
    ok: true,
    json: async () => ({ messages: [] })
  })

  render(<ChatPage />)

  await waitFor(() => {
    expect(focusSpy).toHaveBeenCalled()
  })
})
```

- [ ] **Step 3: 增加“已有其他输入焦点时不抢焦点”的测试**

```tsx
it("should not steal focus from another input element", async () => {
  const otherInput = document.createElement("input")
  document.body.appendChild(otherInput)
  otherInput.focus()

  useSessionStore.setState({
    ...useSessionStore.getState(),
    currentSessionId: "session-1"
  })

  fetchMock.mockResolvedValueOnce({
    ok: true,
    json: async () => ({ messages: [] })
  })

  render(<ChatPage />)

  await waitFor(() => {
    expect(fetchMock).toHaveBeenCalledWith("/api/sessions/session-1")
  })

  expect(focusSpy).not.toHaveBeenCalled()

  otherInput.remove()
})
```

- [ ] **Step 4: 增加“切换到新会话后再次聚焦”的测试**

```tsx
it("should focus the input again when switching to a new session", async () => {
  fetchMock.mockResolvedValue({
    ok: true,
    json: async () => ({ messages: [] })
  })

  const { rerender } = render(<ChatPage />)

  useSessionStore.setState({
    ...useSessionStore.getState(),
    currentSessionId: "session-1"
  })
  rerender(<ChatPage />)

  await waitFor(() => {
    expect(focusSpy).toHaveBeenCalledTimes(1)
  })

  useSessionStore.setState({
    ...useSessionStore.getState(),
    currentSessionId: "session-2"
  })
  rerender(<ChatPage />)

  await waitFor(() => {
    expect(focusSpy).toHaveBeenCalledTimes(2)
  })
})
```

- [ ] **Step 5: 保留并更新现有测试，让未登录和无当前会话场景继续通过**

```tsx
expect(screen.getByText("登录后即可开始对话")).toBeInTheDocument()
expect(screen.getByText("禁用状态 true")).toBeInTheDocument()
expect(focusSpy).not.toHaveBeenCalled()
```

### Task 4: 运行定向验证与全量验证

**Files:**
- Verify only

- [ ] **Step 1: 运行聊天页定向测试**

Run: `npm test -- --runInBand __tests__/app/chat-page.test.tsx`  
Expected: PASS，自动聚焦、抢焦点保护、未登录提示相关用例全部通过

- [ ] **Step 2: 运行本地完整验证**

Run: `npm run verify:local`  
Expected: 依次通过 TypeScript、Jest、ESLint、Next build

- [ ] **Step 3: 补充人工联调观察点**

Run: `npm run dev`  
Expected:
- 登录进入首页后，输入框自动获得焦点
- 刷新页面恢复后，输入框自动获得焦点
- 切换会话后，输入框自动获得焦点
- 如果用户正在其他输入框中操作，不会被聊天输入框抢走焦点
