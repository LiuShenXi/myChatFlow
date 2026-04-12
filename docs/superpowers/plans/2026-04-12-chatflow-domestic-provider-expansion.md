# ChatFlow Domestic Provider Expansion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 Qwen、GLM、Kimi、豆包接入当前 ChatFlow 项目，并在设置页与模型选择器中可配置、可选择、可进入文本聊天链路。

**Architecture:** 保留现有 `/api/chat` 与 `/api/keys` 路由协议不变，把新增国产厂商统一收敛到一层 OpenAI-compatible provider 注册表中，`Anthropic` 继续保留独立实现。模型列表继续由静态配置驱动，但 provider 展示信息从共享元数据派生，避免前后端漂移。

**Tech Stack:** Next.js 15, React 19, TypeScript, Jest, Prisma, Vercel AI SDK, Zustand

---

### Task 1: 扩展 provider 工厂与共享元数据

**Files:**
- Modify: `src/lib/ai/providers.ts`
- Test: `__tests__/lib/ai/providers.test.ts`

- [ ] **Step 1: 写 provider 工厂的失败测试**

```ts
import { getOpenAICompatibleProviderMeta, getProvider } from "@/lib/ai/providers"

it('should expose qwen as an openai-compatible provider', () => {
  expect(getOpenAICompatibleProviderMeta("qwen")).toMatchObject({
    id: "qwen"
  })
})

it('should return a model instance for "kimi"', () => {
  const provider = getProvider("kimi", "moonshot-v1-8k", "test-key")
  expect(provider).toBeDefined()
})

it('should return a model instance for "doubao"', () => {
  const provider = getProvider("doubao", "doubao-seed-1.6", "test-key")
  expect(provider).toBeDefined()
})
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npm test -- --runInBand __tests__/lib/ai/providers.test.ts`
Expected: FAIL，提示 `qwen` / `kimi` / `doubao` 不被支持，且 `getOpenAICompatibleProviderMeta` 未定义

- [ ] **Step 3: 实现最小 provider 注册表**

```ts
export type ModelProvider =
  | "openai"
  | "anthropic"
  | "deepseek"
  | "qwen"
  | "glm"
  | "kimi"
  | "doubao"

type OpenAICompatibleProviderMeta = {
  id: Exclude<ModelProvider, "anthropic">
  name: string
  baseURL?: string
  compatibility?: "compatible" | "strict"
}

const OPENAI_COMPATIBLE_PROVIDERS: Record<
  OpenAICompatibleProviderMeta["id"],
  OpenAICompatibleProviderMeta
> = {
  openai: { id: "openai", name: "OpenAI", compatibility: "strict" },
  deepseek: {
    id: "deepseek",
    name: "DeepSeek",
    baseURL: "https://api.deepseek.com/v1",
    compatibility: "compatible"
  },
  qwen: {
    id: "qwen",
    name: "Qwen",
    baseURL: "https://dashscope.aliyuncs.com/compatible-mode/v1",
    compatibility: "compatible"
  },
  glm: {
    id: "glm",
    name: "GLM",
    baseURL: "https://open.bigmodel.cn/api/paas/v4",
    compatibility: "compatible"
  },
  kimi: {
    id: "kimi",
    name: "Kimi",
    baseURL: "https://api.moonshot.cn/v1",
    compatibility: "compatible"
  },
  doubao: {
    id: "doubao",
    name: "豆包",
    baseURL: "https://ark.cn-beijing.volces.com/api/v3",
    compatibility: "compatible"
  }
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `npm test -- --runInBand __tests__/lib/ai/providers.test.ts`
Expected: PASS

- [ ] **Step 5: 提交当前任务**

```bash
git add src/lib/ai/providers.ts __tests__/lib/ai/providers.test.ts
git commit -m "feat: add domestic ai provider registry"
```

### Task 2: 扩展模型配置并覆盖解析行为

**Files:**
- Modify: `src/types/model.ts`
- Test: `__tests__/types/model.test.ts`

- [ ] **Step 1: 写模型配置失败测试**

```ts
import { AVAILABLE_MODELS, getModelConfig } from "@/types/model"

it("should include qwen chat models", () => {
  expect(AVAILABLE_MODELS.some((model) => model.id === "qwen-plus")).toBe(true)
})

it("should resolve kimi model config", () => {
  expect(getModelConfig("moonshot-v1-8k")).toMatchObject({
    provider: "kimi",
    modelId: "moonshot-v1-8k"
  })
})
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npm test -- --runInBand __tests__/types/model.test.ts`
Expected: FAIL，提示模型不存在或测试文件尚未建立

- [ ] **Step 3: 实现国产文本模型清单**

```ts
export const AVAILABLE_MODELS: ModelConfig[] = [
  { id: "gpt-4", name: "GPT-4", provider: "openai", modelId: "gpt-4", supportsVision: true },
  { id: "gpt-4o", name: "GPT-4o", provider: "openai", modelId: "gpt-4o", supportsVision: true },
  {
    id: "claude-3-5-sonnet",
    name: "Claude 3.5 Sonnet",
    provider: "anthropic",
    modelId: "claude-3-5-sonnet-20241022",
    supportsVision: true
  },
  { id: "deepseek-chat", name: "DeepSeek Chat", provider: "deepseek", modelId: "deepseek-chat", supportsVision: false },
  { id: "qwen-plus", name: "Qwen Plus", provider: "qwen", modelId: "qwen-plus", supportsVision: false },
  { id: "qwen-turbo", name: "Qwen Turbo", provider: "qwen", modelId: "qwen-turbo", supportsVision: false },
  { id: "glm-5", name: "GLM-5", provider: "glm", modelId: "glm-5", supportsVision: false },
  { id: "glm-4-7", name: "GLM-4.7", provider: "glm", modelId: "glm-4.7", supportsVision: false },
  { id: "moonshot-v1-8k", name: "Kimi Moonshot v1 8K", provider: "kimi", modelId: "moonshot-v1-8k", supportsVision: false },
  { id: "kimi-k2", name: "Kimi K2", provider: "kimi", modelId: "kimi-k2-0905-preview", supportsVision: false },
  { id: "doubao-seed-1-6", name: "豆包 Seed 1.6", provider: "doubao", modelId: "doubao-seed-1.6", supportsVision: false },
  { id: "doubao-seed-1-6-flash", name: "豆包 Seed 1.6 Flash", provider: "doubao", modelId: "doubao-seed-1.6-flash", supportsVision: false }
]
```

- [ ] **Step 4: 运行测试确认通过**

Run: `npm test -- --runInBand __tests__/types/model.test.ts`
Expected: PASS

- [ ] **Step 5: 提交当前任务**

```bash
git add src/types/model.ts __tests__/types/model.test.ts
git commit -m "feat: add domestic model catalog"
```

### Task 3: 扩展设置页 provider 列表

**Files:**
- Modify: `src/components/settings/ApiKeyManager.tsx`
- Test: `__tests__/components/settings/ApiKeyManager.test.tsx`

- [ ] **Step 1: 写设置页失败测试**

```tsx
it("should render domestic provider inputs", async () => {
  fetchMock.mockResolvedValueOnce({ ok: true, json: async () => [] })

  render(<ApiKeyManager />)

  expect(await screen.findByText("Qwen")).toBeInTheDocument()
  expect(screen.getByText("GLM")).toBeInTheDocument()
  expect(screen.getByText("Kimi")).toBeInTheDocument()
  expect(screen.getByText("豆包")).toBeInTheDocument()
})

it("should save a qwen api key", async () => {
  fetchMock
    .mockResolvedValueOnce({ ok: true, json: async () => [] })
    .mockResolvedValueOnce({ ok: true, json: async () => ({ success: true }) })

  render(<ApiKeyManager />)

  fireEvent.change(await screen.findByLabelText("Qwen API Key"), {
    target: { value: "sk-qwen-test" }
  })

  fireEvent.click(screen.getByRole("button", { name: "保存 Qwen API Key" }))
})
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npm test -- --runInBand __tests__/components/settings/ApiKeyManager.test.tsx`
Expected: FAIL，提示新 provider 文案不存在

- [ ] **Step 3: 让设置页从共享 provider 元数据渲染**

```tsx
const PROVIDERS = getApiKeyProviders()

{PROVIDERS.map((provider) => (
  <div key={provider.id}>
    <label htmlFor={`${provider.id}-api-key`}>{provider.name}</label>
    <Input
      aria-label={`${provider.name} API Key`}
      placeholder={provider.placeholder}
    />
  </div>
))}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `npm test -- --runInBand __tests__/components/settings/ApiKeyManager.test.tsx`
Expected: PASS

- [ ] **Step 5: 提交当前任务**

```bash
git add src/components/settings/ApiKeyManager.tsx __tests__/components/settings/ApiKeyManager.test.tsx
git commit -m "feat: add domestic providers to api key settings"
```

### Task 4: 扩展模型选择器与默认体验

**Files:**
- Modify: `src/components/settings/ModelSelector.tsx`
- Modify: `src/store/session-store.ts`
- Test: `__tests__/components/settings/ModelSelector.test.tsx`
- Test: `__tests__/store/session-store.test.ts`

- [ ] **Step 1: 写模型选择器失败测试**

```tsx
it("should render domestic models in the selector", () => {
  render(<ModelSelector />)
  expect(screen.getByRole("button", { name: "Qwen Plus" })).toBeInTheDocument()
  expect(screen.getByRole("button", { name: "GLM-5" })).toBeInTheDocument()
  expect(screen.getByRole("button", { name: "Kimi K2" })).toBeInTheDocument()
})
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npm test -- --runInBand __tests__/components/settings/ModelSelector.test.tsx __tests__/store/session-store.test.ts`
Expected: FAIL，提示按钮不存在

- [ ] **Step 3: 保持默认模型不变，只扩充可选模型**

```ts
currentModel: "gpt-4",
setModel: (model) => set({ currentModel: model })
```

```tsx
{AVAILABLE_MODELS.map((model) => (
  <DropdownMenuItem key={model.id} onClick={() => setModel(model.id)}>
    {model.name}
  </DropdownMenuItem>
))}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `npm test -- --runInBand __tests__/components/settings/ModelSelector.test.tsx __tests__/store/session-store.test.ts`
Expected: PASS

- [ ] **Step 5: 提交当前任务**

```bash
git add src/components/settings/ModelSelector.tsx src/store/session-store.ts __tests__/components/settings/ModelSelector.test.tsx __tests__/store/session-store.test.ts
git commit -m "feat: expose domestic models in selector"
```

### Task 5: 验证聊天与 key 路由对新增 provider 的兼容性

**Files:**
- Modify: `src/app/api/chat/route.ts`
- Modify: `src/app/api/keys/route.ts`
- Test: `__tests__/app/api/chat/route.test.ts`
- Test: `__tests__/app/api/keys/route.test.ts`

- [ ] **Step 1: 写聊天路由失败测试**

```ts
it("should use the qwen provider when the selected model is qwen-plus", async () => {
  authMock.mockResolvedValue({ user: { id: "user-1" } })
  findUniqueMock.mockResolvedValue({ encryptedKey: "encrypted-value" })
  decryptMock.mockReturnValue("decrypted-value")
  getProviderMock.mockReturnValue({ provider: "qwen-model" })
  streamTextMock.mockImplementation(async () => ({
    toDataStreamResponse: () => new Response("stream-ok", { status: 200 })
  }))

  await POST(
    new Request("http://localhost/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId: "session-1",
        model: "qwen-plus",
        messages: [{ role: "user", content: "你好" }]
      })
    })
  )

  expect(getProviderMock).toHaveBeenCalledWith(
    "qwen",
    "qwen-plus",
    "decrypted-value"
  )
})
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npm test -- --runInBand __tests__/app/api/chat/route.test.ts __tests__/app/api/keys/route.test.ts`
Expected: FAIL，提示 `qwen-plus` 模型未注册

- [ ] **Step 3: 只做最小修正，保持路由协议不变**

```ts
const modelConfig = getModelConfig(modelId)

if (!modelConfig) {
  return new Response("Invalid model", { status: 400 })
}

const apiKeyRecord = await prisma.apiKey.findUnique({
  where: {
    userId_provider: {
      userId: session.user.id,
      provider: modelConfig.provider
    }
  }
})
```

- [ ] **Step 4: 运行测试确认通过**

Run: `npm test -- --runInBand __tests__/app/api/chat/route.test.ts __tests__/app/api/keys/route.test.ts`
Expected: PASS

- [ ] **Step 5: 提交当前任务**

```bash
git add src/app/api/chat/route.ts src/app/api/keys/route.ts __tests__/app/api/chat/route.test.ts __tests__/app/api/keys/route.test.ts
git commit -m "test: verify domestic providers in api routes"
```

### Task 6: 更新说明文档并跑完整验证

**Files:**
- Modify: `README.md`

- [ ] **Step 1: 写 README 失败检查**

```md
- 支持 OpenAI、Anthropic、DeepSeek、Qwen、GLM、Kimi、豆包
```

- [ ] **Step 2: 更新 README 的产品说明与使用入口**

```md
# ChatFlow

支持 OpenAI、Anthropic、DeepSeek、Qwen、GLM、Kimi、豆包的多模型对话平台。
```

- [ ] **Step 3: 运行定向测试集合**

Run: `npm test -- --runInBand __tests__/lib/ai/providers.test.ts __tests__/types/model.test.ts __tests__/components/settings/ApiKeyManager.test.tsx __tests__/components/settings/ModelSelector.test.tsx __tests__/app/api/chat/route.test.ts __tests__/app/api/keys/route.test.ts`
Expected: PASS

- [ ] **Step 4: 运行完整本地验证**

Run: `npm run verify:local`
Expected: exit code 0，`tsc`、`jest`、`lint`、`build` 全部通过

- [ ] **Step 5: 提交当前任务**

```bash
git add README.md
git commit -m "docs: document domestic provider support"
```
