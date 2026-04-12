# ChatFlow 国产 Provider 扩展设计

## 背景

当前 ChatFlow 已支持 `OpenAI`、`Anthropic`、`DeepSeek` 三类模型提供方，并具备以下基础能力：

- 设置页按 provider 保存用户 API Key
- 模型选择器基于静态模型清单切换当前会话模型
- `/api/chat` 根据模型配置解析 provider，再从数据库读取对应 API Key 发起流式对话

现阶段用户已经完成本地登录联调，下一步阻塞点不再是认证，而是“希望直接在当前项目里使用国产模型进行实际对话”。当前代码仅将 `DeepSeek` 作为唯一国产 provider 暴露给用户，无法满足 `Qwen / GLM / Kimi / 豆包` 的实际接入需求。

本次设计目标是把这四家接入当前项目，并在设置页与模型选择器中可配置、可选用、可进入实际聊天链路。

## 目标

1. 扩展 provider 类型，使项目支持 `qwen`、`glm`、`kimi`、`doubao`
2. 让设置页可分别保存和删除这些 provider 的 API Key
3. 让模型选择器可展示并切换新增模型
4. 保持现有 `/api/chat` 链路不重写，只通过 provider 注册表和模型配置扩展完成接入
5. 为缺失 Key、非法 provider、非法 model 等情况保留明确错误提示

## 非目标

本阶段不做以下内容：

- 不做视觉模型、多模态上传和图片理解能力
- 不做推理强度、联网搜索、工具调用等厂商专属高级参数
- 不做“用户自定义模型 ID / Base URL”界面
- 不改变数据库结构，仍沿用“每个 provider 保存一个 API Key”的模式
- 不处理豆包平台的复杂 endpoint 管理，仅先接入可直接通过公共模型 ID 调用的文本模型

## 官方接入依据

本次扩展优先采用“OpenAI 兼容接入”的统一方案，原因是四家都提供了可直接迁移 OpenAI SDK 的入口：

- Qwen / 阿里云百炼：官方文档给出 `https://dashscope.aliyuncs.com/compatible-mode/v1` 和 `qwen-plus` 等模型名
- GLM / 智谱：官方文档给出 `https://open.bigmodel.cn/api/paas/v4/` 作为 OpenAI 兼容基址
- Kimi / Moonshot：官方文档给出 `https://api.moonshot.cn/v1`，并支持如 `moonshot-v1-8k`、`kimi-k2-*` 等模型
- 豆包 / 火山方舟：官方文档与示例显示可通过 `https://ark.cn-beijing.volces.com/api/v3` 使用 `chat.completions` / `responses` 能力，模型可使用平台支持的公开模型 ID

设计推断：
对于当前 ChatFlow 使用的 Vercel AI SDK 场景，`OpenAI-compatible provider registry` 是最稳妥的统一收口方式。`OpenAI` 本身和所有兼容厂商都可由 `createOpenAI` 生成模型实例，差异只收束在 `baseURL`、`compatibility`、`name` 与静态模型列表上。`Anthropic` 仍保留原独立实现。

## 方案比较

### 方案 A：每个国产厂商写一套独立 provider 分支

优点：

- 直观
- 便于未来接入厂商私有参数

缺点：

- `providers.ts` 会快速膨胀
- 多家厂商会重复创建 `createOpenAI({...})(modelId)` 的逻辑
- 新增 provider 时需要继续复制 switch 分支

### 方案 B：引入“OpenAI 兼容 provider 注册表”

优点：

- 和当前代码最契合
- 可直接复用 `createOpenAI`
- 后续新增国产 provider 的成本低
- 设置页与模型列表可以共享同一份 provider 元数据

缺点：

- 需要重构现有 `deepseek` 特例
- 后续若某家完全偏离兼容协议，仍需要额外补丁

### 方案 C：只扩设置页，不打通聊天链路

优点：

- 实现最快

缺点：

- 不能解决用户当前“直接联调对话”的需求
- 会留下 UI 可配、后端不可用的假接入状态

## 采用方案

采用方案 B：统一引入“OpenAI 兼容 provider 注册表”，并保留 `Anthropic` 独立实现。

## 设计细节

### 1. Provider 注册表

新增一组统一元数据，至少包含：

- `id`
- `name`
- `baseURL`
- `compatibility`
- `apiKeyPlaceholder`

其中：

- `openai` 保留 `strict`
- `anthropic` 维持单独分支，不进入兼容注册表
- `deepseek`、`qwen`、`glm`、`kimi`、`doubao` 统一走兼容注册表

这样 `getProvider()` 的职责将变为：

1. 如果是 `anthropic`，调用 `createAnthropic`
2. 否则按 provider id 从注册表查找 OpenAI-compatible 配置
3. 基于元数据创建 `createOpenAI` client，再绑定 `modelId`

### 2. Provider 元数据复用

目前设置页手写了 `PROVIDERS` 数组，和 `providers.ts`、`types/model.ts` 之间没有共享定义。本次会将 provider 展示信息抽到可复用位置，至少让以下能力共享一份 provider 列表：

- 设置页显示名称
- API Key placeholder
- 后端 provider 类型校验

这能避免未来模型已支持但设置页漏显示，或者设置页显示了 provider 但后端不认识的分裂状态。

### 3. 模型清单扩展

`src/types/model.ts` 中的 `AVAILABLE_MODELS` 扩展为“现有国外模型 + 国产文本模型”。

本期模型策略：

- Qwen：选择稳定文本模型，例如 `qwen-plus`、`qwen-turbo`
- GLM：选择通用文本模型，例如 `glm-5`、`glm-4.7`
- Kimi：选择文本模型，例如 `moonshot-v1-8k`、`kimi-k2-0905-preview`
- 豆包：选择公开文本模型，例如 `doubao-seed-1.6`、`doubao-seed-1.6-flash`

说明：

- 模型 ID 以当前官方公开文档或官方平台入口描述为准
- 本阶段只暴露“能直接进行文本对话”的模型
- `supportsVision` 对新增模型统一先置为 `false`，即使官方具备视觉能力，也不在当前 UI 和请求结构中开启

### 4. 设置页行为

`ApiKeyManager` 将新增四家 provider 的输入区块，但不改变当前交互方式：

- 首次进入时拉取 `/api/keys`
- 未保存时展示输入框 + 保存按钮
- 已保存时展示“已配置”状态 + 删除按钮
- 允许覆盖写入同 provider 的新 Key

界面不增加额外字段。也就是说：

- Qwen 只填阿里云百炼 API Key
- GLM 只填智谱 API Key
- Kimi 只填 Moonshot API Key
- 豆包 只填火山方舟 API Key

### 5. 聊天链路行为

`/api/chat` 保持现有行为不变：

1. 从请求中拿 `model`
2. 调 `getModelConfig(model)`
3. 用 `modelConfig.provider` 读取数据库中的 provider 对应 Key
4. 解密 Key
5. 用 `getProvider(provider, modelConfig.modelId, apiKey)` 构造 AI SDK model
6. 调用 `streamText`

换句话说，本次不新增新的 chat route 协议，也不引入 provider 级别的特殊分支。

### 6. 错误处理

保留并强化以下行为：

- model 不存在：返回 `400 Invalid model`
- provider 未配置 key：返回 `400`，提示“请先在设置中配置 <provider> 的 API Key”
- provider 未注册：在 provider 工厂中抛出 `Unsupported provider`

如果遇到某家兼容协议有细微差异，应优先在 provider 工厂层修补，而不是把兼容逻辑散落进 `/api/chat`。

### 7. 测试策略

本次采用 TDD，优先补四类测试：

1. Provider 工厂测试
   - 新增 provider 可返回模型实例
   - 未知 provider 仍抛错
2. 模型配置测试
   - 新增模型可通过 `getModelConfig` 被正确解析
3. 设置页组件测试
   - 新 provider 在设置页出现
   - 可保存与删除国产 provider 的 key
4. 聊天路由测试
   - 选中新增模型时，会按模型对应 provider 去数据库取 key
   - 会把正确的 provider + modelId 交给 `getProvider`

## 影响范围

预期变更文件：

- `src/lib/ai/providers.ts`
- `src/types/model.ts`
- `src/components/settings/ApiKeyManager.tsx`
- `src/components/settings/ModelSelector.tsx`
- `src/app/api/chat/route.ts` 或其测试
- `src/app/api/keys/route.ts` 或其测试
- `README.md`
- 相关测试文件

## 风险与控制

### 风险 1：模型 ID 变更频率较高

控制：

- 选择官方已公开、较稳定的文本模型名
- 将模型列表集中在 `src/types/model.ts`
- 后续若单家模型名变动，只需改配置，不需要改聊天链路

### 风险 2：豆包的公共模型与 endpoint 机制并存

控制：

- 本期只接公共文本模型 ID
- 不在 UI 中暴露 endpoint 选择
- 如果后续用户需要自定义 endpoint，再单开一期设计

### 风险 3：设置页与后端定义漂移

控制：

- 提炼共享 provider 元数据
- 测试覆盖设置页和后端 provider 工厂

## 验收标准

完成后应满足：

1. 设置页可看到 `Qwen / GLM / Kimi / 豆包 / DeepSeek / OpenAI / Anthropic`
2. 用户可分别保存与删除这些 provider 的 API Key
3. 模型选择器可看到新增国产文本模型
4. 选择新增模型后，请求 `/api/chat` 会从对应 provider 读取 key 并进入模型调用
5. 全量测试、lint、build 通过

## 后续演进

后续若要继续扩展，可拆分为独立迭代：

- 自定义模型 ID / Base URL
- 豆包 endpoint 管理
- 视觉模型与图片上传
- provider 能力标签与按能力筛选模型
- 更多国产厂商，例如 MiniMax、SiliconFlow、腾讯混元
