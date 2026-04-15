# ChatFlow 项目架构总览

更新时间：2026-04-15

## 文档目标

本文档只回答实现层问题：

- 系统由哪些模块构成
- 一条聊天请求经过哪些环节
- 认证、会话、模型路由和落库如何协作
- 后续扩展应该从哪里入手

## 一句话概括

ChatFlow 是一个基于 `Next.js App Router` 的单体全栈聊天应用。浏览器只和当前 Next.js 应用通信，服务端统一完成认证、会话校验、API Key 解密、模型路由、流式响应和数据持久化。

## 目录与模块职责

- `src/app`：页面与 Route Handlers 入口
- `src/components`：布局、聊天、会话、设置与基础 UI
- `src/hooks`：如 `useImageUpload`
- `src/lib/ai`：provider 适配、能力判断、流式处理
- `src/lib/auth`：NextAuth 配置与密钥加解密
- `src/lib/chat`：消息片段转换
- `src/store`：客户端共享状态
- `src/types`：模型元数据、聊天相关类型

补充说明：

- `src/lib/db` 里放的是 Prisma Client 单例，供路由和服务端逻辑统一访问数据库
- `prisma/schema.prisma` 定义了 `User`、`ChatSession`、`Message`、`ApiKey`、`CustomModelConfig` 等核心表结构

## 核心链路

1. 用户打开聊天页，客户端读取 `useSession()`
2. 已登录时拉取 `/api/sessions`，必要时自动创建首条会话
3. 发送消息时调用 `/api/chat`
4. 服务端根据模型元数据确定 provider 与 API Key
5. `streamText` 返回流式响应
6. 完成后把用户消息与助手消息持久化到数据库

这条链路不是单纯的“前端发消息，后端吐文本”，而是同时串起了认证、会话、模型路由、图片能力判断和落库。

## 页面与交互层

### `src/app/(chat)/page.tsx`

这是聊天主页面的编排中心，负责把这些能力拼起来：

- `useSession()` 读取登录状态
- `useChat()` 连接 `/api/chat`
- `MessageList` 展示历史与流式消息
- `InputArea` 收集文本和图片
- 当前会话和当前模型来自 `session-store`

它还会在当前选择的是自定义模型时拉取 `/api/custom-models`，用于判断这条自定义模型是否支持图片输入。

### `src/app/(chat)/layout.tsx`

这是聊天区域的页面壳子，负责固定挂载：

- `Header`
- `SessionDrawer`
- `SettingsDialog`

### `src/components`

组件层按场景拆分：

- `components/chat`：输入区、消息列表、消息渲染
- `components/session`：会话抽屉、会话项
- `components/settings`：模型选择、API Key 管理、自定义模型管理
- `components/layout`：顶部导航和全局入口
- `components/auth`：登录提示等认证相关 UI
- `components/ui`：基础 UI 组件

## 认证与会话

### `src/lib/auth/auth.config.ts`

认证配置在这里收口：

- 只有环境变量完整时才注册 Google 或 GitHub provider
- session 策略使用 `jwt`
- 登录页固定为 `/login`
- `callbacks` 会把用户 ID 写回 session，方便服务端路由识别当前用户

### `src/lib/auth/next-auth.ts`

这里把 `authConfig` 和 `PrismaAdapter` 组装成可用的 NextAuth 实例，供页面和 Route Handlers 共用。

### `src/app/api/sessions/route.ts`

这个接口负责当前用户会话列表的查询和创建：

- `GET`：返回当前用户的会话列表，按 `updatedAt` 倒序
- `POST`：创建新会话，携带当前模型作为初始值

### `src/app/api/sessions/[id]/route.ts`

这个接口负责单个会话的读写：

- `GET`：读取某条会话及其消息
- `PATCH`：重命名会话
- `DELETE`：删除会话

### 会话初始化机制

`SessionDrawer` 会在用户已登录、会话列表加载完成且当前没有任何会话时，自动调用 `/api/sessions` 创建第一条会话。这样聊天页不会长时间停留在“可进入但不可聊”的空状态。

## 模型、密钥与多模态

### `src/types/model.ts`

这里定义了系统的内置模型元数据：

- 模型展示名
- provider
- provider 对应的真实 `modelId`
- 是否支持图片输入

同时也定义了自定义模型 ID 前缀 `custom:`，前端通过它区分内置模型和自定义模型。

### `src/app/api/keys/route.ts`

这里负责用户的 provider 级 API Key：

- `GET`：只返回是否配置过、`provider`、`endpointId`、更新时间等公开信息
- `POST`：对密钥做 AES-256-GCM 加密后保存
- `DELETE`：删除对应 provider 的密钥配置

其中豆包是特殊分支，除了 API Key 之外还需要保存 `endpointId`。

### `src/app/api/custom-models/route.ts`

这里负责自定义模型配置：

- `GET`：返回当前用户的自定义模型列表
- `POST`：创建一条自定义模型配置

返回给前端的是公开配置，不会把明文密钥暴露出去，只会告诉前端是否已有 Key、模型能力状态等信息。

### `src/app/api/custom-models/[id]/route.ts`

这里负责单条自定义模型的更新和删除：

- `PATCH`：更新名称、`baseUrl`、`modelId`、能力标记和密钥
- `DELETE`：删除这条自定义模型

### `src/lib/auth/encryption.ts`

用户保存的 API Key 和自定义模型密钥都通过这里做 AES-256-GCM 加密与解密，`ENCRYPTION_KEY` 不存在或格式不对时会直接报错。

### 自定义模型能力判断

自定义模型不是简单地“一律支持图片”或“一律不支持图片”。当前实现会结合：

- `visionCapability`
- `visionCapabilitySource`
- `baseUrl`
- `modelId`

去推断或修正能力状态。对已知模型可以做推断，遇到图片输入失败时还会把能力学习为 `text-only`，避免后续继续把图片发给明显不支持的模型。

### `src/hooks/useImageUpload.ts` 与 `src/lib/chat/message-parts.ts`

图片输入链路是贯通的：

- `useImageUpload` 负责选择、压缩、读取图片
- `chat-store` 暂存图片
- `buildImageAttachments()` 把图片转成 `experimental_attachments`
- `extractImageUrls()` 在服务端从 attachment 中还原图片 URL
- `mapStoredMessageToUiMessage()` 在回读历史消息时把图片重新挂回消息对象

当前图片以 Data URL 形式进入消息链路，适合快速迭代，但也意味着体积和存储成本会随着图片数量增加而上涨。

## 聊天请求链路

### `src/app/api/chat/route.ts`

这是整个系统最核心的服务端入口。它做的事情不是单一的“调用模型”，而是一整套编排：

- `auth()` 校验当前用户
- 解析 `model`、`sessionId` 和消息体
- 通过 `getModelConfig()` 和 `parseCustomModelId()` 判断是内置模型还是自定义模型
- 读取 `ApiKey` 或 `CustomModelConfig`
- 用 `decrypt()` 还原密钥
- 校验图片输入能力
- 为豆包读取 `endpointId`
- 调用 `getProvider()` 或 `createCustomOpenAICompatibleModel()`
- 用 `streamText()` 返回流式响应
- 在 `onFinish` 里持久化用户消息、助手消息和会话更新时间

### Provider 适配

`src/lib/ai/providers.ts` 把不同厂商统一收口：

- `anthropic` 走独立适配
- `openai`、`deepseek`、`qwen`、`glm`、`kimi`、`doubao` 走 OpenAI-compatible 通路
- 自定义模型直接使用用户配置的 `baseURL + modelId + apiKey`

这样做的好处是，前端不用理解每家厂商的细节，只需要给出模型 ID 和密钥，服务端就能返回可调用的语言模型实例。

### 流式与错误收口

`src/lib/ai/stream-handler.ts` 负责把底层错误映射成更适合前端展示的提示，例如：

- API Key 无效或过期
- 速率限制
- 消息过长

`/api/chat` 通过 `toDataStreamResponse()` 输出流式结果，前端在接收过程中就能实时看到助手回复。

### 落库策略

当前实现只在请求完成时统一落库，不做中间 chunk 持久化：

- 先保存用户消息
- 再保存助手最终回复和 token 统计
- 最后更新 `ChatSession.updatedAt`

这种方式简单稳定，也更符合当前阶段的产品节奏。

## 状态分工

### `src/store/session-store.ts`

负责会话和当前模型的共享状态：

- 会话列表
- 当前会话 ID
- 当前模型

### `src/store/chat-store.ts`

负责聊天输入辅助状态：

- 输入框文本
- 待发送图片
- 是否正在流式输出

### `src/store/settings-store.ts`

负责页面偏好设置：

- 主题模式
- 会话抽屉开关

这里和 `useChat()` 的职责是分开的。`useChat()` 管消息流和提交，Zustand 负责页面级共享状态和辅助交互状态。

## 数据与持久化

### `prisma/schema.prisma`

核心数据关系可以概括成四层：

- `User`：系统用户主体
- `ChatSession`：一次对话会话
- `Message`：具体的用户或助手消息
- `ApiKey` / `CustomModelConfig`：模型接入配置

几个关键点：

- 一个用户可以有多条会话
- 一条会话可以有多条消息
- `ApiKey` 按 `userId + provider` 唯一
- 自定义模型配置单独存，不和公共 provider Key 混在一起

## 这套架构的扩展入口

如果后续继续演进，优先从这些地方下手最稳：

- 新增或调整 provider：改 `src/lib/ai/providers.ts` 和 `src/types/model.ts`
- 扩展会话能力：改 `src/app/api/sessions/*` 和 `src/components/session/*`
- 扩展密钥管理：改 `src/app/api/keys/route.ts` 和 `src/components/settings/ApiKeyManager.tsx`
- 扩展自定义模型能力：改 `src/app/api/custom-models/*`、`src/lib/ai/custom-model-capabilities.ts`
- 调整消息流和落库：改 `src/app/api/chat/route.ts`、`src/lib/chat/message-parts.ts`

## 关键文件索引

- `src/app/(chat)/page.tsx`
- `src/app/api/chat/route.ts`
- `src/app/api/sessions/route.ts`
- `src/app/api/sessions/[id]/route.ts`
- `src/app/api/keys/route.ts`
- `src/app/api/custom-models/route.ts`
- `src/app/api/custom-models/[id]/route.ts`
- `src/lib/ai/providers.ts`
- `src/lib/ai/stream-handler.ts`
- `src/lib/auth/auth.config.ts`
- `src/lib/auth/next-auth.ts`
- `src/lib/auth/encryption.ts`
- `src/lib/chat/message-parts.ts`
- `src/lib/db/prisma.ts`
- `src/store/session-store.ts`
- `src/store/chat-store.ts`
- `src/store/settings-store.ts`
- `src/types/model.ts`
- `src/types/chat.ts`
- `prisma/schema.prisma`

## 总结

ChatFlow 当前已经形成了一套分工比较清晰的单体全栈聊天架构：

- `src/app` 负责页面与 API 入口
- `src/components` 负责交互呈现
- `src/lib/auth` 负责认证和密钥保护
- `src/lib/ai` 负责模型适配、能力判断和流式处理
- `src/store` 负责页面级共享状态
- `prisma` 负责持久化

对后续维护来说，最重要的不是“再加一层抽象”，而是继续保持这些边界清楚、职责单一。
