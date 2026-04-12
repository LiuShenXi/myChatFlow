# ChatFlow Custom Model Key Per Config Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让每条自定义模型独立绑定自己的 API Key，并移除 `custom-openai` 全局密钥入口。

**Architecture:** 在 `CustomModelConfig` 中新增 `encryptedApiKey`，让自定义模型路由负责保存和更新加密密钥；聊天路由命中 `custom:<id>` 时直接读取该模型自己的密钥并构造 provider。设置页移除 `custom-openai`，把 API Key 输入迁移到自定义模型表单。

**Tech Stack:** Next.js 15, React 19, TypeScript, Prisma, Jest, Testing Library

---

## File Structure

- Modify: `prisma/schema.prisma`
- Modify: `src/app/api/chat/route.ts`
- Modify: `src/app/api/custom-models/route.ts`
- Modify: `src/app/api/custom-models/[id]/route.ts`
- Modify: `src/lib/ai/providers.ts`
- Modify: `src/components/settings/ApiKeyManager.tsx`
- Modify: `src/components/settings/CustomModelManager.tsx`
- Modify: `__tests__/app/api/chat/route.test.ts`
- Modify: `__tests__/app/api/custom-models/route.test.ts`
- Modify: `__tests__/app/api/custom-models/[id]/route.test.ts`
- Modify: `__tests__/components/settings/ApiKeyManager.test.tsx`
- Modify: `__tests__/components/settings/CustomModelManager.test.tsx`

### Task 1: 用失败测试定义新的数据和接口契约

**Files:**
- Modify: `__tests__/app/api/custom-models/route.test.ts`
- Modify: `__tests__/app/api/custom-models/[id]/route.test.ts`
- Modify: `__tests__/app/api/chat/route.test.ts`
- Modify: `__tests__/components/settings/ApiKeyManager.test.tsx`
- Modify: `__tests__/components/settings/CustomModelManager.test.tsx`

- [ ] **Step 1: 先为创建自定义模型补上必填 `apiKey` 的测试**

```ts
it("should reject creating a custom model without an api key", async () => {
  authMock.mockResolvedValue({ user: { id: "user-1" } })

  const response = await POST(
    new Request("http://localhost/api/custom-models", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "GLM 5.1",
        baseUrl: "https://open.bigmodel.cn/api/paas/v4",
        modelId: "glm-5.1",
        apiKey: ""
      })
    })
  )

  expect(response.status).toBe(400)
})
```

- [ ] **Step 2: 为更新自定义模型补“留空不改 key”的测试**

```ts
it("should keep the old api key when patch payload omits apiKey", async () => {
  authMock.mockResolvedValue({ user: { id: "user-1" } })

  await PATCH(
    new Request("http://localhost/api/custom-models/cfg-1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Updated Gateway",
        baseUrl: "https://new.example.com/v1",
        modelId: "gpt-4.1-mini"
      })
    }),
    { params: Promise.resolve({ id: "cfg-1" }) }
  )

  expect(updateMock).toHaveBeenCalledWith(
    expect.objectContaining({
      data: expect.not.objectContaining({
        encryptedApiKey: expect.anything()
      })
    })
  )
})
```

- [ ] **Step 3: 为聊天路由补“读取自定义模型自己的 key”测试**

```ts
it("should decrypt and use the api key stored on the custom model config", async () => {
  customModelFindUniqueMock.mockResolvedValue({
    id: "cfg-1",
    userId: "user-1",
    baseUrl: "https://example.com/v1",
    modelId: "gpt-4o-mini",
    encryptedApiKey: "encrypted-custom-key"
  })

  expect(findUniqueMock).not.toHaveBeenCalled()
  expect(decryptMock).toHaveBeenCalledWith("encrypted-custom-key")
})
```

- [ ] **Step 4: 为设置页补“移除 custom-openai、改为模型表单输入 key”的测试**

```tsx
expect(screen.queryByLabelText("Custom OpenAI-Compatible API Key")).not.toBeInTheDocument()
expect(screen.getByLabelText("自定义模型 API Key")).toBeInTheDocument()
```

- [ ] **Step 5: 运行定向测试并确认先失败**

Run: `npm test -- --runInBand __tests__/app/api/custom-models/route.test.ts __tests__/app/api/custom-models/[id]/route.test.ts __tests__/app/api/chat/route.test.ts __tests__/components/settings/ApiKeyManager.test.tsx __tests__/components/settings/CustomModelManager.test.tsx`
Expected: FAIL，原因是实现仍依赖 `custom-openai` 或缺少 `apiKey` 字段

### Task 2: 最小修改后端数据流，让自定义模型自带密钥

**Files:**
- Modify: `prisma/schema.prisma`
- Modify: `src/app/api/custom-models/route.ts`
- Modify: `src/app/api/custom-models/[id]/route.ts`
- Modify: `src/app/api/chat/route.ts`

- [ ] **Step 1: 在 Prisma schema 中加入过渡期可空的 `encryptedApiKey`**

```prisma
model CustomModelConfig {
  id              String   @id @default(cuid())
  userId          String
  name            String
  baseUrl         String
  modelId         String
  encryptedApiKey String?  @db.Text
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}
```

- [ ] **Step 2: 在创建路由里校验并加密 `apiKey`**

```ts
const apiKey = payload.apiKey?.trim()

if (!name || !modelId || !baseUrl || !apiKey || !isValidBaseUrl(baseUrl)) {
  return createInvalidConfigResponse()
}
```

- [ ] **Step 3: 在更新路由里支持可选更新 `apiKey`**

```ts
const apiKey = payload.apiKey?.trim()
const data = {
  name,
  baseUrl,
  modelId,
  ...(apiKey ? { encryptedApiKey: encrypt(apiKey) } : {})
}
```

- [ ] **Step 4: 在聊天路由里改为读取 `customModelConfig.encryptedApiKey`**

```ts
const apiKey = customModelConfig
  ? decrypt(customModelConfig.encryptedApiKey)
  : decrypt(apiKeyRecord.encryptedKey)
```

- [ ] **Step 5: 运行相关后端测试**

Run: `npm test -- --runInBand __tests__/app/api/custom-models/route.test.ts __tests__/app/api/custom-models/[id]/route.test.ts __tests__/app/api/chat/route.test.ts`
Expected: PASS

### Task 3: 调整设置页交互，去掉全局 custom-openai

**Files:**
- Modify: `src/lib/ai/providers.ts`
- Modify: `src/components/settings/ApiKeyManager.tsx`
- Modify: `src/components/settings/CustomModelManager.tsx`

- [ ] **Step 1: 从 API Key provider 列表中移除 `custom-openai`**

```ts
const API_KEY_PROVIDER_ORDER: ModelProvider[] = [
  "openai",
  "anthropic",
  "deepseek",
  "qwen",
  "glm",
  "kimi",
  "doubao"
]
```

- [ ] **Step 2: 为自定义模型表单新增 `apiKey` 输入**

```ts
type DraftState = {
  name: string
  baseUrl: string
  modelId: string
  apiKey: string
}
```

- [ ] **Step 3: 编辑时保留旧 key，只在输入新值时更新**

```ts
body: JSON.stringify({
  name: payload.name,
  baseUrl: payload.baseUrl,
  modelId: payload.modelId,
  ...(payload.apiKey ? { apiKey: payload.apiKey } : {})
})
```

- [ ] **Step 4: 运行组件测试**

Run: `npm test -- --runInBand __tests__/components/settings/ApiKeyManager.test.tsx __tests__/components/settings/CustomModelManager.test.tsx`
Expected: PASS

### Task 4: 做全量验证并同步数据库

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: 生成 Prisma Client**

Run: `npx prisma generate`
Expected: Prisma Client generated successfully

- [ ] **Step 2: 同步本地数据库结构**

Run: `npx prisma db push`
Expected: The database is already in sync with the Prisma schema. 或数据库已成功更新

- [ ] **Step 3: 运行本地全量验证**

Run: `npm run verify:local`
Expected: PASS
