# Custom Model Vision Capability Learning Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为自定义模型引入视觉能力三态判断、手动覆盖和失败学习，避免文本模型误收图片，同时允许视觉模型被显式启用。

**Architecture:** 在 `CustomModelConfig` 上新增能力字段，后端通过统一能力解析模块决定是否放行图片请求，并在命中高置信度非视觉错误时回写学习结果。前端设置页暴露能力状态与手动切换入口，聊天页根据最终能力显示更清晰的提示。

**Tech Stack:** Next.js App Router、Prisma、Jest、React、Zustand

---

### Task 1: 扩展数据模型与 API DTO

**Files:**
- Modify: `prisma/schema.prisma`
- Modify: `src/app/api/custom-models/route.ts`
- Modify: `src/app/api/custom-models/[id]/route.ts`
- Test: `__tests__/app/api/custom-models/route.test.ts`
- Test: `__tests__/app/api/custom-models/[id]/route.test.ts`

- [ ] **Step 1: 为自定义模型 API 写失败测试，要求返回能力字段**

```ts
expect(await response.json()).resolves.toEqual([
  expect.objectContaining({
    id: "cfg-1",
    visionCapability: "unknown",
    visionCapabilitySource: "inferred"
  })
])
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npm test -- __tests__/app/api/custom-models/route.test.ts __tests__/app/api/custom-models/[id]/route.test.ts`
Expected: FAIL，提示响应对象缺少 `visionCapability` 相关字段

- [ ] **Step 3: 在 Prisma 模型上增加能力字段**

```prisma
model CustomModelConfig {
  id                     String   @id @default(cuid())
  userId                 String
  name                   String
  baseUrl                String
  modelId                String
  visionCapability       String   @default("unknown")
  visionCapabilitySource String   @default("inferred")
  encryptedApiKey        String?  @db.Text
  createdAt              DateTime @default(now())
  updatedAt              DateTime @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, updatedAt])
}
```

- [ ] **Step 4: 将能力字段加入 custom-models 路由 DTO**

```ts
function toPublicConfig(config: {
  id: string
  name: string
  baseUrl: string
  modelId: string
  visionCapability: string
  visionCapabilitySource: string
  encryptedApiKey: string | null
  updatedAt: string | Date
}) {
  return {
    id: config.id,
    name: config.name,
    baseUrl: config.baseUrl,
    modelId: config.modelId,
    visionCapability: config.visionCapability,
    visionCapabilitySource: config.visionCapabilitySource,
    hasApiKey: Boolean(config.encryptedApiKey),
    updatedAt: config.updatedAt
  }
}
```

- [ ] **Step 5: 创建与更新时写入默认能力值**

```ts
data: {
  userId: session.user.id,
  name,
  baseUrl,
  modelId,
  visionCapability: "unknown",
  visionCapabilitySource: "inferred",
  encryptedApiKey: encrypt(apiKey)
}
```

- [ ] **Step 6: 运行测试确认通过**

Run: `npm test -- __tests__/app/api/custom-models/route.test.ts __tests__/app/api/custom-models/[id]/route.test.ts`
Expected: PASS

### Task 2: 建立自定义模型能力解析与失败学习模块

**Files:**
- Create: `src/lib/ai/custom-model-capabilities.ts`
- Modify: `src/types/model.ts`
- Test: `__tests__/types/model.test.ts`
- Test: `__tests__/lib/chat/message-parts.test.ts`
- Create: `__tests__/lib/ai/custom-model-capabilities.test.ts`

- [ ] **Step 1: 为能力解析模块写失败测试**

```ts
expect(resolveCustomModelVisionCapability({
  modelId: "glm-5v-turbo",
  visionCapability: "unknown",
  visionCapabilitySource: "inferred"
})).toEqual({
  capability: "vision",
  source: "inferred"
})

expect(classifyVisionCapabilityFailure({
  providerHint: "glm",
  error: new Error("仅支持纯文本")
})).toBe("not-vision-supported")
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npm test -- __tests__/types/model.test.ts __tests__/lib/chat/message-parts.test.ts __tests__/lib/ai/custom-model-capabilities.test.ts`
Expected: FAIL，提示模块不存在或断言不成立

- [ ] **Step 3: 创建能力解析模块**

```ts
export type VisionCapability = "unknown" | "vision" | "text-only"
export type VisionCapabilitySource = "manual" | "inferred" | "learned"

export function inferVisionCapabilityFromProvider(modelId: string) {
  const normalized = modelId.trim().toLowerCase()

  if (normalized === "glm-5v-turbo" || normalized === "glm-4.6v") {
    return "vision" as const
  }

  if (normalized === "glm-5.1" || normalized === "glm-5" || normalized === "glm-4.7") {
    return "text-only" as const
  }

  return "unknown" as const
}
```

- [ ] **Step 4: 实现最终能力解析与失败分类函数**

```ts
export function resolveCustomModelVisionCapability(config: {
  modelId: string
  visionCapability: VisionCapability
  visionCapabilitySource: VisionCapabilitySource
}) {
  if (config.visionCapability !== "unknown") {
    return {
      capability: config.visionCapability,
      source: config.visionCapabilitySource
    }
  }

  const inferred = inferVisionCapabilityFromProvider(config.modelId)

  return {
    capability: inferred,
    source: inferred === "unknown" ? "inferred" : "inferred"
  }
}
```

```ts
export function classifyVisionCapabilityFailure(options: {
  providerHint: "glm" | "unknown"
  error: unknown
}) {
  const message = options.error instanceof Error ? options.error.message : String(options.error)

  if (options.providerHint === "glm") {
    if (message.includes("仅支持纯文本") || message.includes("不支持图片输入")) {
      return "not-vision-supported" as const
    }
  }

  return "unknown" as const
}
```

- [ ] **Step 5: 让 `modelSupportsImageInput` 不再硬编码 custom 默认值**

```ts
export function modelSupportsImageInput(modelId: string) {
  return getModelConfig(modelId)?.supportsVision ?? false
}
```

- [ ] **Step 6: 更新旧测试预期**

```ts
expect(modelSupportsImageInput("custom:cfg-1")).toBe(false)
```

- [ ] **Step 7: 运行测试确认通过**

Run: `npm test -- __tests__/types/model.test.ts __tests__/lib/chat/message-parts.test.ts __tests__/lib/ai/custom-model-capabilities.test.ts`
Expected: PASS

### Task 3: 聊天路由接入能力判断与失败学习

**Files:**
- Modify: `src/app/api/chat/route.ts`
- Modify: `src/lib/ai/stream-handler.ts`
- Test: `__tests__/app/api/chat/route.test.ts`
- Test: `__tests__/lib/ai/stream-handler.test.ts`

- [ ] **Step 1: 为聊天路由补失败测试**

```ts
await expect(response.json()).resolves.toEqual({
  error: "当前模型能力未知，请先到设置中开启图片能力后再发送",
  notice: "当前自定义模型尚未识别出图片能力"
})
```

```ts
await expect(response.json()).resolves.toEqual({
  error: "当前模型不支持图片输入，请切换到支持多模态的模型后再发送",
  notice: "已自动识别该模型暂不支持图片输入，系统已为你关闭图片能力。"
})
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npm test -- __tests__/app/api/chat/route.test.ts __tests__/lib/ai/stream-handler.test.ts`
Expected: FAIL，提示缺少能力判断或 notice 字段

- [ ] **Step 3: 在 chat route 读取自定义模型最终能力**

```ts
const resolvedCustomVision = customModelConfig
  ? resolveCustomModelVisionCapability(customModelConfig)
  : null

if (lastUserImages.length > 0 && customModelConfig) {
  if (resolvedCustomVision?.capability === "unknown") {
    return NextResponse.json({
      error: "当前模型能力未知，请先到设置中开启图片能力后再发送",
      notice: "当前自定义模型尚未识别出图片能力"
    }, { status: 400 })
  }

  if (resolvedCustomVision?.capability === "text-only") {
    return NextResponse.json({
      error: "当前模型不支持图片输入，请切换到支持多模态的模型后再发送"
    }, { status: 400 })
  }
}
```

- [ ] **Step 4: 在流式失败时做学习回写**

```ts
try {
  const result = await streamText(...)
  return result.toDataStreamResponse({ getErrorMessage: getChatErrorMessage })
} catch (error) {
  if (customModelConfig && lastUserImages.length > 0) {
    const failure = classifyVisionCapabilityFailure({
      providerHint: inferProviderHintFromCustomModel(customModelConfig),
      error
    })

    if (failure === "not-vision-supported") {
      await prisma.customModelConfig.update({
        where: { id: customModelConfig.id },
        data: {
          visionCapability: "text-only",
          visionCapabilitySource: "learned"
        }
      })
    }
  }

  return createErrorResponse(error)
}
```

- [ ] **Step 5: 扩展错误响应支持 notice**

```ts
return new Response(JSON.stringify({
  error: message,
  ...(notice ? { notice } : {})
}), {
  status,
  headers: { "Content-Type": "application/json" }
})
```

- [ ] **Step 6: 运行测试确认通过**

Run: `npm test -- __tests__/app/api/chat/route.test.ts __tests__/lib/ai/stream-handler.test.ts`
Expected: PASS

### Task 4: 设置页增加图片能力状态与手动切换

**Files:**
- Modify: `src/components/settings/CustomModelManager.tsx`
- Modify: `src/app/api/custom-models/route.ts`
- Modify: `src/app/api/custom-models/[id]/route.ts`
- Test: `__tests__/components/settings/CustomModelManager.test.tsx`

- [ ] **Step 1: 为设置页写失败测试**

```ts
expect(screen.getByText("图片能力 自动识别中")).toBeInTheDocument()
await user.click(screen.getByLabelText("编辑 GLM-5V-Turbo"))
expect(screen.getByLabelText("Custom model vision capability")).toHaveValue("vision")
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npm test -- __tests__/components/settings/CustomModelManager.test.tsx`
Expected: FAIL，提示没有能力字段或控件

- [ ] **Step 3: 扩展 CustomModelManager DTO 与表单状态**

```ts
type CustomModelConfigDTO = {
  id: string
  name: string
  baseUrl: string
  modelId: string
  visionCapability: "unknown" | "vision" | "text-only"
  visionCapabilitySource: "manual" | "inferred" | "learned"
  hasApiKey: boolean
  updatedAt: string
}
```

- [ ] **Step 4: 在表单中加入能力选择器**

```tsx
<select
  id="custom-model-vision-capability"
  aria-label="Custom model vision capability"
  value={draft.visionCapability}
  onChange={(event) => updateDraft("visionCapability", event.target.value as DraftState["visionCapability"])}
>
  <option value="unknown">自动识别中</option>
  <option value="vision">支持图片输入</option>
  <option value="text-only">不支持图片输入</option>
</select>
```

- [ ] **Step 5: 保存与编辑接口传递能力字段**

```ts
const payload = {
  name: draft.name.trim(),
  baseUrl: draft.baseUrl.trim(),
  modelId: draft.modelId.trim(),
  visionCapability: draft.visionCapability,
  apiKey: draft.apiKey.trim()
}
```

- [ ] **Step 6: 列表展示能力标签与来源说明**

```tsx
<div className="text-xs text-muted-foreground">
  图片能力 {formatVisionCapability(model.visionCapability)}
</div>
<div className="text-xs text-muted-foreground">
  来源 {formatVisionCapabilitySource(model.visionCapabilitySource)}
</div>
```

- [ ] **Step 7: 运行测试确认通过**

Run: `npm test -- __tests__/components/settings/CustomModelManager.test.tsx`
Expected: PASS

### Task 5: 聊天页与输入区提示优化

**Files:**
- Modify: `src/app/(chat)/page.tsx`
- Modify: `src/components/chat/InputArea.tsx`
- Modify: `src/components/settings/ModelSelector.tsx`
- Test: `__tests__/app/chat-page.test.tsx`

- [ ] **Step 1: 为聊天页补失败测试**

```ts
expect(
  screen.getByText("错误信息 当前模型能力未知，请先到设置中开启图片能力后再发送")
).toBeInTheDocument()
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npm test -- __tests__/app/chat-page.test.tsx`
Expected: FAIL，提示自定义模型未知能力的文案不正确

- [ ] **Step 3: 聊天页区分 unknown 与 text-only 两种提示**

```ts
const customCapability = useCustomModelVisionCapability(currentModel)

if (images.length > 0 && customCapability === "unknown") {
  event.preventDefault()
  setSubmitError("当前模型能力未知，请先到设置中开启图片能力后再发送")
  return false
}
```

- [ ] **Step 4: 展示后端 notice 提示**

```ts
onResponse: async (response) => {
  const notice = response.headers.get("X-Chat-Notice")
  if (notice) {
    setSubmitError(notice)
  }
}
```

- [ ] **Step 5: 运行测试确认通过**

Run: `npm test -- __tests__/app/chat-page.test.tsx`
Expected: PASS

### Task 6: 全链路验证

**Files:**
- Modify: `src/app/api/chat/route.ts`
- Modify: `src/components/settings/CustomModelManager.tsx`
- Test: `__tests__/app/api/chat/route.test.ts`
- Test: `__tests__/components/settings/CustomModelManager.test.tsx`
- Test: `__tests__/app/chat-page.test.tsx`

- [ ] **Step 1: 运行能力相关测试集**

Run: `npm test -- __tests__/types/model.test.ts __tests__/lib/chat/message-parts.test.ts __tests__/lib/ai/custom-model-capabilities.test.ts __tests__/app/api/chat/route.test.ts __tests__/components/settings/CustomModelManager.test.tsx __tests__/app/chat-page.test.tsx`
Expected: PASS

- [ ] **Step 2: 运行本地构建级校验**

Run: `npm test -- --runInBand`
Expected: PASS 或仅失败于与本次改动无关的既有问题

- [ ] **Step 3: 整理用户可见结果**

```md
- 自定义模型支持三态视觉能力
- 未知模型默认不直接放图
- 用户可手动开启视觉能力
- 命中明确非视觉错误时自动学习并提示
```
