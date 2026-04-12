# ChatFlow 自定义模型与 Base URL 接入设计

## 背景

当前 ChatFlow 已经具备以下基础能力：

- 支持 OpenAI、Anthropic、DeepSeek、Qwen、GLM、Kimi、豆包等内置 provider
- 模型选择器基于静态模型清单切换当前会话模型
- 设置页支持按 provider 保存 API Key
- 聊天链路会根据模型配置解析 provider，并从数据库读取对应 API Key 发起请求

这套结构已经足够支撑“内置模型 + 内置 provider”的产品形态，但也存在一个明显限制：

- 用户不能自己接入新的 OpenAI-compatible 接口
- 用户不能填写自定义 `Base URL`
- 用户不能填写自己的 `Model ID`
- 如果某家兼容服务不在当前静态 provider 列表里，用户就无法在现有架构内接入

随着国产兼容平台和自建网关场景变多，这个限制会越来越明显。用户现在的真实需求不是“继续加几个写死的 provider”，而是要让系统支持：

1. 用户新增一条自定义模型配置
2. 自己填写 `名称`、`Base URL`、`Model ID`
3. 这条配置能直接出现在模型选择器里
4. 聊天时按这条配置实际请求对应的 OpenAI-compatible 接口

本期明确范围如下：

- 支持用户新增一条自定义 provider / 模型配置
- 先只支持 `OpenAI-compatible`
- 每条自定义配置直接作为模型选择器里的一个可选项
- 配置作为独立实体持久化，不和 API Key 混在一起

## 目标

1. 支持用户持久化保存自定义模型配置
2. 配置至少包含 `名称`、`Base URL`、`Model ID`
3. 每条自定义配置都能直接出现在模型选择器中
4. 聊天链路可识别并调用这些自定义模型
5. 保持现有内置模型、现有 API Key 保存逻辑和现有聊天主流程尽量不变

## 非目标

- 不支持 `Anthropic-compatible` 或任意协议类型
- 不支持一条自定义模型绑定一个单独 API Key
- 不支持自定义模型分组、标签、图标或能力描述
- 不支持多字段高级参数，如温度、超时、headers、组织 ID
- 不做“完整模型管理系统”或“多租户 provider 管理平台”

## 方案比较

### 方案 A：只给现有 provider 增加 `Base URL` 和默认 `Model ID`

优点：

- 表面改动最少
- 复用现有设置页结构

缺点：

- 只能覆盖现有静态 provider
- 无法真正支持“新增一条自定义配置”
- 用户依然受限于当前 provider 枚举

### 方案 B：允许用户新增独立自定义配置，并作为模型项出现

优点：

- 最贴近真实需求
- 用户新增后即可直接选择和使用
- 和当前“模型选择器驱动聊天”的架构一致

缺点：

- 需要新增数据表与独立路由
- 需要在模型解析阶段增加一层动态查询

### 方案 C：做成更完整的多模型管理系统

优点：

- 扩展性最强
- 后续加更多协议或高级参数更方便

缺点：

- 明显超出当前需求
- 会把本期从“可用增量”做成“重构型项目”

## 采用方案

采用方案 B：

- 新增独立的 `CustomModelConfig` 表
- 用户可增删改查自定义模型配置
- 每条自定义配置直接出现在模型选择器中
- 聊天链路在未命中内置模型时，再查找当前用户的自定义模型配置

## 设计细节

### 1. 数据模型

新增 `CustomModelConfig` 实体，建议字段如下：

- `id`
- `userId`
- `name`
- `baseUrl`
- `modelId`
- `createdAt`
- `updatedAt`

推荐 Prisma 结构：

```prisma
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

并在 `User` 上增加关联：

```prisma
customModelConfigs CustomModelConfig[]
```

这样可以把“用户的 API Key”与“用户的自定义模型定义”清晰分开：

- `ApiKey` 只管密钥
- `CustomModelConfig` 只管模型定义

### 2. 自定义模型的协议边界

本期只支持 `OpenAI-compatible`。

这意味着：

- 自定义模型不需要额外协议枚举
- 聊天链路可以直接复用现有 `createOpenAI` 体系
- 不需要为 `Anthropic` 再做额外兼容层或用户可选协议

这样可以显著降低：

- 设置页复杂度
- provider 工厂分支复杂度
- 测试矩阵复杂度

### 3. API Key 与自定义模型的关系

本期建议引入一个新的内置 provider 身份，例如：

- `custom-openai`

用途是：

- 用户保存一组“自定义 OpenAI-compatible API Key”
- 所有自定义模型配置都统一复用这一个 API Key

这样可以避免把这轮需求做成：

- 一条自定义模型一把单独密钥
- 或者把 API Key 塞进 `CustomModelConfig`

原因：

- API Key 是认证信息，应继续走现有加密存储链路
- `CustomModelConfig` 是模型定义，不应承担密钥职责
- “一组自定义模型共享一把兼容服务 API Key”是本期最合理的最小模型

### 4. 设置页交互

设置页建议新增一个“自定义模型”区域，职责如下：

- 展示当前用户已保存的自定义模型配置
- 新增配置
- 编辑配置
- 删除配置

每条配置字段仅包含：

- `名称`
- `Base URL`
- `Model ID`

交互原则：

- 最小可用，不做复杂表格或管理台
- 保存成功后立即反映到模型选择器
- 新增和编辑尽量复用一套表单

同时，在 API Key 管理区域中新增一张“自定义 OpenAI-compatible”卡片，用来保存这类自定义模型统一使用的 API Key。

### 5. 模型选择器行为

模型选择器建议分成两组：

- 内置模型
- 自定义模型

但每条自定义配置都直接作为一个可点击模型项，不做二次展开或额外跳转。

选择器中展示建议：

- 内置模型继续使用现有静态名称
- 自定义模型直接显示用户填写的 `name`

当前会话的 `model` 字段需要能区分“内置模型 ID”和“自定义模型 ID”。本期建议采用前缀约定，例如：

- 内置模型：继续使用现有 `gpt-4`、`qwen-plus`、`doubao-seed-1-6`
- 自定义模型：保存成 `custom:<configId>`

这样可以避免内置模型 ID 与用户自定义记录 ID 冲突，同时保持聊天路由解析简单。

### 6. 聊天链路行为

当前 `/api/chat` 依赖 `getModelConfig(modelId)` 返回静态模型配置。

本期建议扩成两步解析：

1. 先尝试用 `getModelConfig(modelId)` 命中内置模型
2. 若未命中，再判断它是否是 `custom:<id>` 形式
3. 若是，则从 `CustomModelConfig` 表按 `id + 当前 userId` 查询
4. 查询成功后，用该记录的 `baseUrl + modelId` 构造 OpenAI-compatible client
5. API Key 则从 `custom-openai` 的加密存储中读取

错误处理建议：

- 自定义模型不存在：返回 `400 Invalid model`
- 自定义模型存在但未配置 `custom-openai` 的 API Key：返回明确错误
- `Base URL` 或 `Model ID` 异常：由请求层统一进入现有错误处理链路

### 7. 路由设计

建议新增独立路由，而不是复用 `/api/keys`：

- `GET /api/custom-models`
- `POST /api/custom-models`
- `PATCH /api/custom-models/[id]`
- `DELETE /api/custom-models/[id]`

推荐返回结构：

```ts
type CustomModelConfigDTO = {
  id: string
  name: string
  baseUrl: string
  modelId: string
  updatedAt: string
}
```

校验规则建议：

- `name` 必填，去首尾空格
- `baseUrl` 必填，且必须是合法 URL
- `modelId` 必填，去首尾空格

这样可以把配置管理和聊天逻辑解耦：

- `/api/custom-models` 只负责配置 CRUD
- `/api/chat` 只消费解析结果

### 8. 错误处理策略

应保持“错误明确、尽量早失败”的原则。

典型错误包括：

- 未登录访问自定义模型接口：`401`
- 保存自定义模型时缺字段或 URL 非法：`400`
- 选中不存在的自定义模型：`400 Invalid model`
- 使用自定义模型但未配置 `custom-openai` API Key：`400`，明确提示先去设置页配置

本期不做复杂 toast 中心，只要保持 API 返回清晰且前端不静默吞错即可。

## 测试策略

本期采用 TDD，建议至少补齐以下 4 类测试。

### 1. 自定义模型路由测试

文件建议：

- `__tests__/app/api/custom-models/route.test.ts`
- `__tests__/app/api/custom-models/[id]/route.test.ts`

覆盖：

- 未登录时拒绝访问
- 成功创建配置
- URL 非法时报 `400`
- 成功更新配置
- 成功删除配置
- 仅能访问当前用户自己的配置

### 2. 设置页组件测试

文件建议：

- `__tests__/components/settings/CustomModelManager.test.tsx`

覆盖：

- 展示已有自定义模型
- 新增一条配置
- 编辑一条配置
- 删除一条配置
- 非法 URL 时不能提交

### 3. 模型选择器测试

文件建议：

- `__tests__/components/settings/ModelSelector.test.tsx`

覆盖：

- 自定义模型会出现在选择器中
- 选择自定义模型后，会话当前模型值变成 `custom:<id>`

### 4. 聊天路由测试

文件建议：

- `__tests__/app/api/chat/route.test.ts`

补充覆盖：

- 选中 `custom:<id>` 时，会查询 `CustomModelConfig`
- 会使用数据库中的 `baseUrl + modelId`
- 会读取 `custom-openai` 的 API Key
- 未配置 `custom-openai` API Key 时返回明确错误

## 影响范围

- `prisma/schema.prisma`
- `src/app/api/custom-models/route.ts`
- `src/app/api/custom-models/[id]/route.ts`
- `src/app/api/chat/route.ts`
- `src/components/settings/SettingsDialog.tsx`
- 可能新增 `src/components/settings/CustomModelManager.tsx`
- `src/components/settings/ApiKeyManager.tsx`
- `src/components/settings/ModelSelector.tsx`
- 相关测试文件

## 验收标准

完成后应满足：

1. 用户可新增、编辑、删除一条自定义模型配置
2. 每条配置包含 `名称`、`Base URL`、`Model ID`
3. 每条自定义配置都会直接出现在模型选择器中
4. 选中自定义模型后，聊天链路会使用数据库中的 `baseUrl + modelId`
5. 自定义模型统一依赖 `custom-openai` API Key
6. `npm run verify:local` 通过

## 后续演进

如果后续要继续扩展，可拆成独立迭代：

- `Anthropic-compatible` 支持
- 一条自定义模型绑定单独 API Key
- 自定义模型分组与搜索
- 高级参数，如 headers、超时、温度
- 自定义 provider 图标、说明和能力标签
