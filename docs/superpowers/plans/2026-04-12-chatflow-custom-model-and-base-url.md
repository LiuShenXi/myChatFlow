# ChatFlow Custom Model And Base URL Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为 ChatFlow 增加用户自定义 OpenAI-compatible 模型配置能力，让用户可以保存 `名称 + Base URL + Model ID`，并把这些配置直接作为模型选择器里的可选项接入聊天链路。

**Architecture:** 新增独立的 `CustomModelConfig` 数据表和 `/api/custom-models` CRUD 路由，把“模型定义”与“API Key”解耦；继续使用 `ApiKey` 存储密钥，但新增一个 `custom-openai` provider 作为所有自定义模型共享的 API Key。模型选择器在静态内置模型之外，再拉取并显示用户自定义模型；聊天路由在未命中静态模型时，回退解析 `custom:<id>` 并用数据库中的 `baseUrl + modelId` 构造 OpenAI-compatible client。

**Tech Stack:** Next.js 15, React 19, TypeScript, Prisma, Jest, Testing Library, Vercel AI SDK, Zustand

---

## File Structure

- Create: `docs/superpowers/plans/2026-04-12-chatflow-custom-model-and-base-url.md`
- Modify: `prisma/schema.prisma`
- Modify: `src/lib/ai/providers.ts`
- Modify: `src/types/model.ts`
- Modify: `src/app/api/chat/route.ts`
- Modify: `src/app/api/keys/route.ts`
- Create: `src/app/api/custom-models/route.ts`
- Create: `src/app/api/custom-models/[id]/route.ts`
- Modify: `src/components/settings/ApiKeyManager.tsx`
- Modify: `src/components/settings/SettingsDialog.tsx`
- Modify: `src/components/settings/ModelSelector.tsx`
- Create: `src/components/settings/CustomModelManager.tsx`
- Modify: `__tests__/lib/ai/providers.test.ts`
- Modify: `__tests__/types/model.test.ts`
- Modify: `__tests__/app/api/chat/route.test.ts`
- Modify: `__tests__/app/api/keys/route.test.ts`
- Create: `__tests__/app/api/custom-models/route.test.ts`
- Create: `__tests__/app/api/custom-models/[id]/route.test.ts`
- Modify: `__tests__/components/settings/ApiKeyManager.test.tsx`
- Modify: `__tests__/components/settings/ModelSelector.test.tsx`
- Create: `__tests__/components/settings/CustomModelManager.test.tsx`

### Task 1: 先用测试定义自定义模型与 `custom-openai` 的边界

**Files:**
- Modify: `__tests__/lib/ai/providers.test.ts`
- Modify: `__tests__/types/model.test.ts`
- Modify: `__tests__/app/api/keys/route.test.ts`

- [ ] **Step 1: 给 provider 测试补 `custom-openai` 元数据断言**

```ts
it("should expose custom-openai metadata for api key settings", () => {
  expect(getOpenAICompatibleProviderMeta("custom-openai")).toMatchObject({
    id: "custom-openai",
    name: "自定义 OpenAI-Compatible"
  })
})
```

- [ ] **Step 2: 给模型类型测试补 `custom:<id>` 解析工具测试**

```ts
it("should recognize custom model ids", () => {
  expect(isCustomModelId("custom:cfg-1")).toBe(true)
  expect(parseCustomModelId("custom:cfg-1")).toBe("cfg-1")
})
```

```ts
it("should return null for non-custom model ids", () => {
  expect(parseCustomModelId("gpt-4")).toBeNull()
})
```

- [ ] **Step 3: 给 `/api/keys` 测试补 `custom-openai` 保存断言**

```ts
it("should save a custom-openai api key like other compatible providers", async () => {
  authMock.mockResolvedValue({ user: { id: "user-1" } })
  encryptMock.mockReturnValue("encrypted-key")

  const response = await POST(
    new Request("http://localhost/api/keys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        provider: "custom-openai",
        apiKey: "sk-custom-test"
      })
    })
  )

  expect(response.status).toBe(200)
  expect(upsertMock).toHaveBeenCalledWith(
    expect.objectContaining({
      create: expect.objectContaining({
        provider: "custom-openai"
      })
    })
  )
})
```

- [ ] **Step 4: 运行定向测试确认先失败**

Run: `npm test -- --runInBand __tests__/lib/ai/providers.test.ts __tests__/types/model.test.ts __tests__/app/api/keys/route.test.ts`  
Expected: FAIL，提示 `custom-openai` 和自定义模型解析工具尚未定义

### Task 2: 扩展 provider 与模型工具，支撑 `custom-openai` 和 `custom:<id>`

**Files:**
- Modify: `src/lib/ai/providers.ts`
- Modify: `src/types/model.ts`

- [ ] **Step 1: 在 `ModelProvider` 中加入 `custom-openai`**

```ts
export type ModelProvider =
  | "openai"
  | "anthropic"
  | "deepseek"
  | "qwen"
  | "glm"
  | "kimi"
  | "doubao"
  | "custom-openai"
```

- [ ] **Step 2: 在 provider 元数据里加入 `custom-openai`**

```ts
custom-openai: {
  id: "custom-openai",
  name: "自定义 OpenAI-Compatible",
  compatibility: "compatible",
  apiKeyPlaceholder: "sk-..."
}
```

- [ ] **Step 3: 提供自定义 Base URL 的 model/client 工具**

```ts
export function createCustomOpenAICompatibleModel(
  baseURL: string,
  modelId: string,
  apiKey: string
) {
  return createOpenAI({
    apiKey,
    baseURL,
    compatibility: "compatible",
    name: "custom-openai"
  })(modelId)
}
```

- [ ] **Step 4: 在 `src/types/model.ts` 中增加自定义模型 ID 工具**

```ts
export const CUSTOM_MODEL_PREFIX = "custom:"

export function isCustomModelId(modelId: string) {
  return modelId.startsWith(CUSTOM_MODEL_PREFIX)
}

export function parseCustomModelId(modelId: string) {
  if (!isCustomModelId(modelId)) {
    return null
  }

  return modelId.slice(CUSTOM_MODEL_PREFIX.length) || null
}
```

- [ ] **Step 5: 运行定向测试确认转绿**

Run: `npm test -- --runInBand __tests__/lib/ai/providers.test.ts __tests__/types/model.test.ts __tests__/app/api/keys/route.test.ts`  
Expected: PASS

### Task 3: 先用测试定义自定义模型 CRUD 路由

**Files:**
- Create: `__tests__/app/api/custom-models/route.test.ts`
- Create: `__tests__/app/api/custom-models/[id]/route.test.ts`

- [ ] **Step 1: 为列表/创建路由写失败测试**

```ts
it("should reject unauthenticated custom model list requests", async () => {
  authMock.mockResolvedValue(null)
  const response = await GET()
  expect(response.status).toBe(401)
})

it("should reject invalid base urls when creating a custom model", async () => {
  authMock.mockResolvedValue({ user: { id: "user-1" } })

  const response = await POST(
    new Request("http://localhost/api/custom-models", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "My Gateway",
        baseUrl: "not-a-url",
        modelId: "gpt-4o-mini"
      })
    })
  )

  expect(response.status).toBe(400)
})
```

- [ ] **Step 2: 为列表/创建路由写成功测试**

```ts
it("should return the current user's custom models", async () => {
  authMock.mockResolvedValue({ user: { id: "user-1" } })
  findManyMock.mockResolvedValue([
    {
      id: "cfg-1",
      name: "My Gateway",
      baseUrl: "https://example.com/v1",
      modelId: "gpt-4o-mini",
      updatedAt: "2026-04-12T00:00:00.000Z"
    }
  ])

  const response = await GET()

  await expect(response.json()).resolves.toEqual([
    expect.objectContaining({ id: "cfg-1", name: "My Gateway" })
  ])
})
```

```ts
it("should create a custom model for the current user", async () => {
  authMock.mockResolvedValue({ user: { id: "user-1" } })
  createMock.mockResolvedValue({
    id: "cfg-1",
    userId: "user-1",
    name: "My Gateway",
    baseUrl: "https://example.com/v1",
    modelId: "gpt-4o-mini"
  })

  const response = await POST(
    new Request("http://localhost/api/custom-models", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "My Gateway",
        baseUrl: "https://example.com/v1",
        modelId: "gpt-4o-mini"
      })
    })
  )

  expect(response.status).toBe(200)
})
```

- [ ] **Step 3: 为单条更新/删除路由写测试**

```ts
it("should update the current user's custom model", async () => {
  authMock.mockResolvedValue({ user: { id: "user-1" } })
  updateMock.mockResolvedValue({
    id: "cfg-1",
    name: "Updated Gateway",
    baseUrl: "https://new.example.com/v1",
    modelId: "gpt-4.1-mini"
  })

  const response = await PATCH(
    new Request("http://localhost/api/custom-models/cfg-1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Updated Gateway",
        baseUrl: "https://new.example.com/v1",
        modelId: "gpt-4.1-mini"
      })
    }),
    {
      params: Promise.resolve({ id: "cfg-1" })
    }
  )

  expect(response.status).toBe(200)
})
```

```ts
it("should delete the current user's custom model", async () => {
  authMock.mockResolvedValue({ user: { id: "user-1" } })

  const response = await DELETE(
    new Request("http://localhost/api/custom-models/cfg-1", {
      method: "DELETE"
    }),
    {
      params: Promise.resolve({ id: "cfg-1" })
    }
  )

  expect(response.status).toBe(200)
})
```

- [ ] **Step 4: 运行定向测试确认先失败**

Run: `npm test -- --runInBand __tests__/app/api/custom-models/route.test.ts __tests__/app/api/custom-models/[id]/route.test.ts`  
Expected: FAIL，提示路由文件尚未存在

### Task 4: 新增 Prisma 模型与 `/api/custom-models` 路由

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `src/app/api/custom-models/route.ts`
- Create: `src/app/api/custom-models/[id]/route.ts`

- [ ] **Step 1: 在 Prisma schema 中新增 `CustomModelConfig` 与 `User` 关联**

```prisma
model User {
  id                 String              @id @default(cuid())
  email              String              @unique
  name               String?
  image              String?
  emailVerified      DateTime?
  createdAt          DateTime            @default(now())
  updatedAt          DateTime            @updatedAt

  accounts           Account[]
  sessions           Session[]
  chatSessions       ChatSession[]
  apiKeys            ApiKey[]
  customModelConfigs CustomModelConfig[]
}

model CustomModelConfig {
  id        String   @id @default(cuid())
  userId    String
  name      String
  baseUrl   String
  modelId   String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, updatedAt])
}
```

- [ ] **Step 2: 实现 `/api/custom-models` 的 GET/POST**

```ts
function isValidBaseUrl(baseUrl: string) {
  try {
    const url = new URL(baseUrl)
    return url.protocol === "http:" || url.protocol === "https:"
  } catch {
    return false
  }
}
```

```ts
export async function GET() {
  const session = await auth()

  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 })
  }

  const configs = await prisma.customModelConfig.findMany({
    where: { userId: session.user.id },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      name: true,
      baseUrl: true,
      modelId: true,
      updatedAt: true
    }
  })

  return NextResponse.json(configs)
}
```

```ts
export async function POST(req: Request) {
  const session = await auth()

  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 })
  }

  const { name, baseUrl, modelId } = await req.json()

  if (!name?.trim() || !modelId?.trim() || !isValidBaseUrl(baseUrl?.trim())) {
    return NextResponse.json({ error: "自定义模型配置不合法" }, { status: 400 })
  }

  const config = await prisma.customModelConfig.create({
    data: {
      userId: session.user.id,
      name: name.trim(),
      baseUrl: baseUrl.trim(),
      modelId: modelId.trim()
    }
  })

  return NextResponse.json(config)
}
```

- [ ] **Step 3: 实现 `/api/custom-models/[id]` 的 PATCH/DELETE，并按 `id + userId` 保护**

```ts
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  const { id } = await params

  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 })
  }

  const { name, baseUrl, modelId } = await req.json()

  if (!name?.trim() || !modelId?.trim() || !isValidBaseUrl(baseUrl?.trim())) {
    return NextResponse.json({ error: "自定义模型配置不合法" }, { status: 400 })
  }

  const config = await prisma.customModelConfig.updateManyAndReturn({
    where: {
      id,
      userId: session.user.id
    },
    data: {
      name: name.trim(),
      baseUrl: baseUrl.trim(),
      modelId: modelId.trim()
    }
  })

  return NextResponse.json(config[0] ?? null)
}
```

```ts
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  const { id } = await params

  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 })
  }

  await prisma.customModelConfig.deleteMany({
    where: {
      id,
      userId: session.user.id
    }
  })

  return NextResponse.json({ success: true })
}
```

- [ ] **Step 4: 运行自定义模型路由测试确认转绿**

Run: `npm test -- --runInBand __tests__/app/api/custom-models/route.test.ts __tests__/app/api/custom-models/[id]/route.test.ts`  
Expected: PASS

### Task 5: 先用测试定义设置页与模型选择器的自定义模型行为

**Files:**
- Create: `__tests__/components/settings/CustomModelManager.test.tsx`
- Modify: `__tests__/components/settings/ModelSelector.test.tsx`
- Modify: `__tests__/components/settings/SettingsDialog.test.tsx`

- [ ] **Step 1: 给自定义模型管理组件写新增/编辑/删除测试**

```tsx
it("should create a custom model", async () => {
  fetchMock
    .mockResolvedValueOnce({ ok: true, json: async () => [] })
    .mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        id: "cfg-1",
        name: "My Gateway",
        baseUrl: "https://example.com/v1",
        modelId: "gpt-4o-mini"
      })
    })

  render(<CustomModelManager />)

  fireEvent.change(await screen.findByLabelText("自定义模型名称"), {
    target: { value: "My Gateway" }
  })
  fireEvent.change(screen.getByLabelText("自定义 Base URL"), {
    target: { value: "https://example.com/v1" }
  })
  fireEvent.change(screen.getByLabelText("自定义 Model ID"), {
    target: { value: "gpt-4o-mini" }
  })

  fireEvent.click(screen.getByRole("button", { name: "保存自定义模型" }))

  await waitFor(() => {
    expect(fetchMock).toHaveBeenLastCalledWith(
      "/api/custom-models",
      expect.objectContaining({ method: "POST" })
    )
  })
})
```

- [ ] **Step 2: 给模型选择器补自定义模型渲染和选择测试**

```tsx
it("should render custom models and store custom:<id> when selected", async () => {
  fetchMock.mockResolvedValueOnce({
    ok: true,
    json: async () => [
      {
        id: "cfg-1",
        name: "My Gateway",
        baseUrl: "https://example.com/v1",
        modelId: "gpt-4o-mini"
      }
    ]
  })

  render(<ModelSelector />)

  expect(await screen.findByRole("button", { name: "My Gateway" })).toBeInTheDocument()

  fireEvent.click(screen.getByRole("button", { name: "My Gateway" }))

  expect(useSessionStore.getState().currentModel).toBe("custom:cfg-1")
})
```

- [ ] **Step 3: 给设置弹窗补“自定义模型区域存在”的测试**

```tsx
it("should render the custom model manager when authenticated", () => {
  useSessionMock.mockReturnValue({ data: { user: { id: "user-1" } }, status: "authenticated" })

  render(<SettingsDialog open={true} onOpenChange={jest.fn()} />)

  expect(screen.getByText("自定义模型")).toBeInTheDocument()
})
```

- [ ] **Step 4: 运行前端定向测试确认先失败**

Run: `npm test -- --runInBand __tests__/components/settings/CustomModelManager.test.tsx __tests__/components/settings/ModelSelector.test.tsx __tests__/components/settings/SettingsDialog.test.tsx`  
Expected: FAIL，提示组件或新行为尚未实现

### Task 6: 实现自定义模型设置区与模型选择器

**Files:**
- Create: `src/components/settings/CustomModelManager.tsx`
- Modify: `src/components/settings/SettingsDialog.tsx`
- Modify: `src/components/settings/ModelSelector.tsx`
- Modify: `src/components/settings/ApiKeyManager.tsx`

- [ ] **Step 1: 在 `ApiKeyManager` 中加入 `custom-openai` 卡片**

```ts
// providers.ts 中的 getApiKeyProviders 返回 custom-openai 后，
// ApiKeyManager 可沿用现有通用渲染逻辑，无需新增特殊分支。
```

- [ ] **Step 2: 新建 `CustomModelManager`，实现最小 CRUD UI**

```tsx
export function CustomModelManager() {
  const [models, setModels] = useState<CustomModelConfigDTO[]>([])
  const [draft, setDraft] = useState({
    name: "",
    baseUrl: "",
    modelId: ""
  })
  const [editingId, setEditingId] = useState<string | null>(null)

  useEffect(() => {
    async function loadModels() {
      const response = await fetch("/api/custom-models")
      if (!response.ok) return
      setModels(await response.json())
    }

    void loadModels()
  }, [])
```

```tsx
  async function handleSave() {
    const endpoint = editingId
      ? `/api/custom-models/${editingId}`
      : "/api/custom-models"

    const method = editingId ? "PATCH" : "POST"

    const response = await fetch(endpoint, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(draft)
    })

    if (!response.ok) return

    const saved = await response.json()
    setModels((current) =>
      editingId
        ? current.map((model) => (model.id === editingId ? saved : model))
        : [saved, ...current]
    )
    setDraft({ name: "", baseUrl: "", modelId: "" })
    setEditingId(null)
  }
```

- [ ] **Step 3: 在 `SettingsDialog` 中并排渲染 `ApiKeyManager` 与 `CustomModelManager`**

```tsx
<>
  <ApiKeyManager />
  <Separator />
  <CustomModelManager />
</>
```

- [ ] **Step 4: 让 `ModelSelector` 加载并显示自定义模型**

```tsx
const [customModels, setCustomModels] = useState<CustomModelConfigDTO[]>([])

useEffect(() => {
  async function loadCustomModels() {
    try {
      const response = await fetch("/api/custom-models")
      if (!response.ok) return
      setCustomModels(await response.json())
    } catch {
      // Ignore unauthenticated and network failures.
    }
  }

  void loadCustomModels()
}, [])
```

```tsx
const currentCustomModel = customModels.find(
  (model) => currentModel === `custom:${model.id}`
)

const currentModelName =
  currentCustomModel?.name ??
  AVAILABLE_MODELS.find((model) => model.id === currentModel)?.name ??
  currentModel
```

```tsx
{customModels.length > 0 ? (
  <>
    <DropdownMenuSeparator />
    {customModels.map((model) => (
      <DropdownMenuItem
        key={model.id}
        onClick={() => setModel(`custom:${model.id}`)}
      >
        {model.name}
      </DropdownMenuItem>
    ))}
  </>
) : null}
```

- [ ] **Step 5: 运行前端定向测试确认转绿**

Run: `npm test -- --runInBand __tests__/components/settings/CustomModelManager.test.tsx __tests__/components/settings/ModelSelector.test.tsx __tests__/components/settings/SettingsDialog.test.tsx`  
Expected: PASS

### Task 7: 让聊天路由真正支持 `custom:<id>` 模型

**Files:**
- Modify: `src/app/api/chat/route.ts`
- Modify: `__tests__/app/api/chat/route.test.ts`

- [ ] **Step 1: 先给聊天路由补自定义模型用例**

```ts
it("should use a custom model config when the current model is custom:<id>", async () => {
  authMock.mockResolvedValue({ user: { id: "user-1" } })
  findUniqueMock
    .mockResolvedValueOnce({
      encryptedKey: "encrypted-custom-key"
    })
  customModelFindUniqueMock.mockResolvedValue({
    id: "cfg-1",
    userId: "user-1",
    name: "My Gateway",
    baseUrl: "https://example.com/v1",
    modelId: "gpt-4o-mini"
  })
  decryptMock.mockReturnValue("decrypted-custom-key")
  createCustomProviderMock.mockReturnValue({ provider: "custom-model" })
  streamTextMock.mockResolvedValue({
    toDataStreamResponse: () => new Response("stream-ok", { status: 200 })
  })

  const response = await POST(
    new Request("http://localhost/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId: "session-1",
        model: "custom:cfg-1",
        messages: [{ role: "user", content: "你好" }]
      })
    })
  )

  expect(response.status).toBe(200)
})
```

```ts
it("should reject custom models when the custom-openai api key is missing", async () => {
  authMock.mockResolvedValue({ user: { id: "user-1" } })
  customModelFindUniqueMock.mockResolvedValue({
    id: "cfg-1",
    userId: "user-1",
    name: "My Gateway",
    baseUrl: "https://example.com/v1",
    modelId: "gpt-4o-mini"
  })
  findUniqueMock.mockResolvedValue(null)

  const response = await POST(
    new Request("http://localhost/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId: "session-1",
        model: "custom:cfg-1",
        messages: []
      })
    })
  )

  expect(response.status).toBe(400)
  await expect(response.json()).resolves.toEqual({
    error: "请先在设置中配置 custom-openai 的 API Key"
  })
})
```

- [ ] **Step 2: 在聊天路由中增加自定义模型解析**

```ts
const staticModelConfig = getModelConfig(modelId)
const customModelId = parseCustomModelId(modelId)

if (!staticModelConfig && !customModelId) {
  return new Response("Invalid model", { status: 400 })
}
```

```ts
const customModelConfig = customModelId
  ? await prisma.customModelConfig.findUnique({
      where: { id: customModelId }
    })
  : null
```

- [ ] **Step 3: 自定义模型分支读取 `custom-openai` API Key 并创建动态 provider**

```ts
const providerId = customModelConfig ? "custom-openai" : staticModelConfig!.provider
```

```ts
const apiKeyRecord = await prisma.apiKey.findUnique({
  where: {
    userId_provider: {
      userId: session.user.id,
      provider: providerId
    }
  }
})
```

```ts
const provider = customModelConfig
  ? createCustomOpenAICompatibleModel(
      customModelConfig.baseUrl,
      customModelConfig.modelId,
      apiKey
    )
  : getProvider(staticModelConfig!.provider, staticModelConfig!.modelId, apiKey)
```

- [ ] **Step 4: 只允许当前用户使用自己的自定义模型**

```ts
if (customModelConfig && customModelConfig.userId !== session.user.id) {
  return new Response("Invalid model", { status: 400 })
}
```

- [ ] **Step 5: 运行聊天路由定向测试确认转绿**

Run: `npm test -- --runInBand __tests__/app/api/chat/route.test.ts`  
Expected: PASS

### Task 8: 做 Prisma 同步与全量验证

**Files:**
- Verify only

- [ ] **Step 1: 同步 Prisma Client**

Run: `npx prisma generate`  
Expected: PASS

- [ ] **Step 2: 推送数据库结构**

Run: `npx prisma db push`  
Expected: PASS

- [ ] **Step 3: 运行自定义模型相关定向测试集**

Run: `npm test -- --runInBand __tests__/app/api/custom-models/route.test.ts __tests__/app/api/custom-models/[id]/route.test.ts __tests__/components/settings/CustomModelManager.test.tsx __tests__/components/settings/ModelSelector.test.tsx __tests__/app/api/chat/route.test.ts`  
Expected: PASS

- [ ] **Step 4: 运行本地完整验证**

Run: `npm run verify:local`  
Expected: PASS，`tsc`、`jest`、`eslint`、`build` 全部通过
