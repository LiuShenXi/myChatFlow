# ChatFlow Doubao Endpoint ID Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为豆包 provider 增加单个 `endpoint-id` 配置能力，让设置页能保存 `API Key + endpoint-id`，并让聊天链路在豆包模型下严格使用数据库中的 `endpointId`。

**Architecture:** 在现有 `ApiKey` 记录上新增可空 `endpointId` 字段，只让 `doubao` 使用。设置页仅在豆包卡片中多显示一个 `endpoint-id` 输入框；`/api/keys` 扩展豆包专属读写校验；`/api/chat` 在豆包模型下读取并强制依赖 `endpointId`，其他 provider 逻辑保持不变。

**Tech Stack:** Next.js 15, React 19, TypeScript, Prisma, Jest, Testing Library, Vercel AI SDK

---

## File Structure

- Create: `docs/superpowers/plans/2026-04-12-chatflow-doubao-endpoint-id.md`
- Modify: `prisma/schema.prisma`
- Modify: `src/app/api/keys/route.ts`
- Modify: `src/app/api/chat/route.ts`
- Modify: `src/components/settings/ApiKeyManager.tsx`
- Modify: `__tests__/app/api/keys/route.test.ts`
- Modify: `__tests__/app/api/chat/route.test.ts`
- Modify: `__tests__/components/settings/ApiKeyManager.test.tsx`

### Task 1: 先用测试定义豆包 `endpoint-id` 的路由行为

**Files:**
- Modify: `__tests__/app/api/keys/route.test.ts`
- Modify: `__tests__/app/api/chat/route.test.ts`

- [ ] **Step 1: 给 `/api/keys` 增加豆包保存失败测试**

```ts
it("should reject saving doubao keys without an endpoint id", async () => {
  authMock.mockResolvedValue({ user: { id: "user-1" } })

  const response = await POST(
    new Request("http://localhost/api/keys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        provider: "doubao",
        apiKey: "doubao-key"
      })
    })
  )

  expect(response.status).toBe(400)
  await expect(response.json()).resolves.toEqual({
    error: "请先填写豆包 endpoint-id"
  })
})
```

- [ ] **Step 2: 给 `/api/keys` 增加豆包保存成功测试**

```ts
it("should save doubao keys together with endpoint id", async () => {
  authMock.mockResolvedValue({ user: { id: "user-1" } })
  encryptMock.mockReturnValue("encrypted-key")

  const response = await POST(
    new Request("http://localhost/api/keys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        provider: "doubao",
        apiKey: "doubao-key",
        endpointId: "ep-20260412"
      })
    })
  )

  expect(response.status).toBe(200)
  expect(upsertMock).toHaveBeenCalledWith({
    where: {
      userId_provider: {
        userId: "user-1",
        provider: "doubao"
      }
    },
    create: {
      userId: "user-1",
      provider: "doubao",
      encryptedKey: "encrypted-key",
      endpointId: "ep-20260412"
    },
    update: {
      encryptedKey: "encrypted-key",
      endpointId: "ep-20260412"
    }
  })
})
```

- [ ] **Step 3: 给 `/api/keys` 增加豆包回显测试**

```ts
it("should include doubao endpoint id in the key list", async () => {
  authMock.mockResolvedValue({ user: { id: "user-1" } })
  findManyMock.mockResolvedValue([
    {
      provider: "doubao",
      updatedAt: "2026-04-12T00:00:00.000Z",
      endpointId: "ep-20260412"
    }
  ])

  const response = await GET()

  await expect(response.json()).resolves.toEqual([
    {
      provider: "doubao",
      updatedAt: "2026-04-12T00:00:00.000Z",
      endpointId: "ep-20260412"
    }
  ])
})
```

- [ ] **Step 4: 给 `/api/chat` 增加豆包缺少 `endpointId` 的失败测试**

```ts
it("should reject doubao chat requests when endpoint id is missing", async () => {
  authMock.mockResolvedValue({ user: { id: "user-1" } })
  findUniqueMock.mockResolvedValue({
    encryptedKey: "encrypted-value",
    endpointId: null
  })

  const response = await POST(
    new Request("http://localhost/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId: "session-1",
        model: "doubao-seed-1-6",
        messages: [{ role: "user", content: "你好" }]
      })
    })
  )

  expect(response.status).toBe(400)
  await expect(response.json()).resolves.toEqual({
    error: "请先在设置中配置豆包 endpoint-id"
  })
})
```

- [ ] **Step 5: 给 `/api/chat` 增加豆包使用 `endpointId` 的成功测试**

```ts
it("should use doubao endpoint id instead of the static model id", async () => {
  authMock.mockResolvedValue({ user: { id: "user-1" } })
  findUniqueMock.mockResolvedValue({
    encryptedKey: "encrypted-value",
    endpointId: "ep-20260412"
  })
  decryptMock.mockReturnValue("decrypted-value")
  getProviderMock.mockReturnValue({ provider: "doubao-model" })
  streamTextMock.mockResolvedValue({
    toDataStreamResponse: () => new Response("stream-ok", { status: 200 })
  })

  const response = await POST(
    new Request("http://localhost/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId: "session-1",
        model: "doubao-seed-1-6",
        messages: [{ role: "user", content: "你好" }]
      })
    })
  )

  expect(response.status).toBe(200)
  expect(getProviderMock).toHaveBeenCalledWith(
    "doubao",
    "ep-20260412",
    "decrypted-value"
  )
})
```

- [ ] **Step 6: 运行路由定向测试，确认先失败**

Run: `npm test -- --runInBand __tests__/app/api/keys/route.test.ts __tests__/app/api/chat/route.test.ts`  
Expected: FAIL，提示缺少 `endpointId` 行为、返回结构或 `getProvider` 参数与新预期不符

### Task 2: 扩展 Prisma 数据模型并实现 `/api/keys` 豆包逻辑

**Files:**
- Modify: `prisma/schema.prisma`
- Modify: `src/app/api/keys/route.ts`

- [ ] **Step 1: 在 `ApiKey` 模型上增加可空 `endpointId` 字段**

```prisma
model ApiKey {
  id           String   @id @default(cuid())
  userId       String
  provider     String
  encryptedKey String   @db.Text
  endpointId   String?
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, provider])
}
```

- [ ] **Step 2: 扩展 `/api/keys` 的请求类型和 GET 返回字段**

```ts
const keys = await prisma.apiKey.findMany({
  where: {
    userId: session.user.id
  },
  select: {
    provider: true,
    updatedAt: true,
    endpointId: true
  }
})
```

```ts
const { provider, apiKey, endpointId } = (await req.json()) as {
  provider: ModelProvider
  apiKey: string
  endpointId?: string
}
```

- [ ] **Step 3: 为豆包增加严格校验**

```ts
if (provider === "doubao" && !endpointId?.trim()) {
  return NextResponse.json(
    { error: "请先填写豆包 endpoint-id" },
    { status: 400 }
  )
}
```

- [ ] **Step 4: 在 upsert 中写入 `endpointId`，非豆包保持 `null`**

```ts
const normalizedEndpointId =
  provider === "doubao" ? endpointId?.trim() ?? null : null

await prisma.apiKey.upsert({
  where: {
    userId_provider: {
      userId: session.user.id,
      provider
    }
  },
  create: {
    userId: session.user.id,
    provider,
    encryptedKey,
    endpointId: normalizedEndpointId
  },
  update: {
    encryptedKey,
    endpointId: normalizedEndpointId
  }
})
```

- [ ] **Step 5: 运行路由定向测试，确认 `/api/keys` 部分转绿**

Run: `npm test -- --runInBand __tests__/app/api/keys/route.test.ts`  
Expected: PASS

### Task 3: 让聊天链路在豆包模型下强制使用 `endpointId`

**Files:**
- Modify: `src/app/api/chat/route.ts`

- [ ] **Step 1: 在读取 `apiKeyRecord` 后增加豆包 `endpointId` 校验**

```ts
if (modelConfig.provider === "doubao" && !apiKeyRecord.endpointId?.trim()) {
  return NextResponse.json(
    { error: "请先在设置中配置豆包 endpoint-id" },
    { status: 400 }
  )
}
```

- [ ] **Step 2: 为豆包计算实际传给 provider 工厂的模型标识**

```ts
const resolvedModelId =
  modelConfig.provider === "doubao"
    ? apiKeyRecord.endpointId!.trim()
    : modelConfig.modelId
```

- [ ] **Step 3: 保持其他 provider 不变，只替换 `getProvider` 的第二个参数**

```ts
const provider = getProvider(
  modelConfig.provider,
  resolvedModelId,
  apiKey
)
```

- [ ] **Step 4: 运行聊天路由定向测试，确认豆包用例转绿**

Run: `npm test -- --runInBand __tests__/app/api/chat/route.test.ts`  
Expected: PASS

### Task 4: 让设置页支持豆包 `endpoint-id` 输入和保存

**Files:**
- Modify: `src/components/settings/ApiKeyManager.tsx`
- Modify: `__tests__/components/settings/ApiKeyManager.test.tsx`

- [ ] **Step 1: 先补设置页失败测试，要求豆包显示额外输入框**

```tsx
it("should render a doubao endpoint id input", async () => {
  fetchMock.mockResolvedValueOnce({
    ok: true,
    json: async () => []
  })

  render(<ApiKeyManager />)

  expect(await screen.findByLabelText("豆包 API Key")).toBeInTheDocument()
  expect(screen.getByLabelText("豆包 endpoint-id")).toBeInTheDocument()
})
```

- [ ] **Step 2: 补豆包缺少 `endpoint-id` 时不能保存的测试**

```tsx
it("should keep the doubao save button disabled without endpoint id", async () => {
  fetchMock.mockResolvedValueOnce({
    ok: true,
    json: async () => []
  })

  render(<ApiKeyManager />)

  fireEvent.change(await screen.findByLabelText("豆包 API Key"), {
    target: { value: "doubao-key" }
  })

  expect(
    screen.getByRole("button", { name: "保存 豆包 API Key" })
  ).toBeDisabled()
})
```

- [ ] **Step 3: 补豆包填写完整后可保存的测试**

```tsx
it("should save doubao api key together with endpoint id", async () => {
  fetchMock
    .mockResolvedValueOnce({ ok: true, json: async () => [] })
    .mockResolvedValueOnce({ ok: true, json: async () => ({ success: true }) })

  render(<ApiKeyManager />)

  fireEvent.change(await screen.findByLabelText("豆包 API Key"), {
    target: { value: "doubao-key" }
  })
  fireEvent.change(screen.getByLabelText("豆包 endpoint-id"), {
    target: { value: "ep-20260412" }
  })

  fireEvent.click(screen.getByRole("button", { name: "保存 豆包 API Key" }))

  await waitFor(() => {
    expect(fetchMock).toHaveBeenLastCalledWith(
      "/api/keys",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          provider: "doubao",
          apiKey: "doubao-key",
          endpointId: "ep-20260412"
        })
      })
    )
  })
})
```

- [ ] **Step 4: 在 `ApiKeyManager` 中扩展豆包专属状态**

```tsx
const [endpointIds, setEndpointIds] = useState<Partial<Record<ModelProvider, string>>>({})
```

```tsx
type SavedProvider = {
  provider: ModelProvider
  endpointId?: string | null
}
```

- [ ] **Step 5: 在加载 `/api/keys` 后回填豆包 `endpointId`**

```tsx
const data = (await response.json()) as SavedProvider[]
setSavedProviders(data.map((item) => item.provider))
setEndpointIds(
  data.reduce<Partial<Record<ModelProvider, string>>>((result, item) => {
    if (item.provider === "doubao" && item.endpointId) {
      result.doubao = item.endpointId
    }
    return result
  }, {})
)
```

- [ ] **Step 6: 仅在豆包卡片中渲染额外输入框，并让保存按钮要求两个字段都存在**

```tsx
const canSave =
  provider.id === "doubao"
    ? Boolean(keys[provider.id]?.trim() && endpointIds.doubao?.trim())
    : Boolean(keys[provider.id]?.trim())
```

```tsx
{provider.id === "doubao" ? (
  <Input
    id="doubao-endpoint-id"
    value={endpointIds.doubao ?? ""}
    placeholder="输入豆包 endpoint-id"
    aria-label="豆包 endpoint-id"
    onChange={(event) =>
      setEndpointIds((current) => ({
        ...current,
        doubao: event.target.value
      }))
    }
  />
) : null}
```

- [ ] **Step 7: 保存豆包时把 `endpointId` 一并提交**

```tsx
body: JSON.stringify({
  provider,
  apiKey,
  endpointId: provider === "doubao" ? endpointIds.doubao?.trim() : undefined
})
```

- [ ] **Step 8: 运行设置页定向测试**

Run: `npm test -- --runInBand __tests__/components/settings/ApiKeyManager.test.tsx`  
Expected: PASS

### Task 5: 做数据库同步与全量验证

**Files:**
- Verify only

- [ ] **Step 1: 同步 Prisma schema**

Run: `npx prisma generate`  
Expected: PASS

- [ ] **Step 2: 推送数据库结构**

Run: `npx prisma db push`  
Expected: PASS

- [ ] **Step 3: 运行豆包相关定向测试集合**

Run: `npm test -- --runInBand __tests__/app/api/keys/route.test.ts __tests__/app/api/chat/route.test.ts __tests__/components/settings/ApiKeyManager.test.tsx`  
Expected: PASS

- [ ] **Step 4: 运行本地完整验证**

Run: `npm run verify:local`  
Expected: PASS，`tsc`、`jest`、`eslint`、`build` 全部通过
