# ChatFlow 自定义模型独立 API Key 设计

## 背景

当前自定义模型功能允许用户保存 `name + baseUrl + modelId`，但聊天时所有自定义模型都会统一读取 `provider = "custom-openai"` 的全局 API Key。这个设计把多个平台、多账号、多网关错误地压成了一对多关系，导致：

- 智谱自定义模型和 Qwen 自定义模型无法分别绑定各自密钥
- 用户看到“模型是单独配置的”，实际却还要依赖一个隐藏的全局密钥
- 一条错误信息会把问题指向 `custom-openai`，而不是具体模型配置

## 目标

- 让每条自定义模型独立保存自己的 API Key
- 移除设置页中的 `custom-openai` 全局密钥入口
- 聊天请求在命中 `custom:<id>` 时，直接使用该模型自己的 `baseUrl + modelId + apiKey`
- 保持内置模型的现有 provider-key 机制不变

## 非目标

- 不改动内置模型 provider 的存储结构
- 不引入多套自定义凭据复用逻辑
- 不做旧 `custom-openai` 数据自动迁移

## 方案比较

### 方案 A：`CustomModelConfig` 直接保存加密后的 API Key

优点：

- 数据模型最贴近业务语义
- 聊天链路最直接，不再跨表回查全局 key
- 设置页交互最容易理解

缺点：

- 需要给 `CustomModelConfig` 增加敏感字段
- 编辑时要处理“保留旧 key / 更新 key”逻辑

### 方案 B：新增 `CustomModelSecret` 一对一表

优点：

- 敏感信息和普通配置分离更彻底

缺点：

- 当前项目体量下明显过度设计
- 查询和测试复杂度都会上升

### 方案 C：沿用 `ApiKey` 表，但给每个自定义模型挂一条 key 记录

优点：

- 复用现有加密逻辑

缺点：

- 会把 `ApiKey` 从 provider 凭据表改成更通用的凭据表
- 改动范围过大，不适合这次修正

## 采用方案

采用方案 A：`CustomModelConfig` 直接保存加密后的 API Key。

## 数据模型

在 `CustomModelConfig` 中新增：

- `encryptedApiKey String? @db.Text`

保留现有字段：

- `id`
- `userId`
- `name`
- `baseUrl`
- `modelId`
- `createdAt`
- `updatedAt`

## 后端设计

### `/api/custom-models`

- `GET` 返回自定义模型列表，不返回明文 key
- 响应中增加 `hasApiKey: true`
- `POST` 创建模型时要求提交：
  - `name`
  - `baseUrl`
  - `modelId`
  - `apiKey`
- 服务端对 `apiKey` 做非空校验并加密后保存到 `encryptedApiKey`

### `/api/custom-models/[id]`

- `PATCH` 支持更新：
  - `name`
  - `baseUrl`
  - `modelId`
  - 可选 `apiKey`
- 若 `apiKey` 为空字符串或缺失，则保留原有 `encryptedApiKey`
- `DELETE` 行为不变

说明：

- 数据库层将该字段暂时设计为可空，用来兼容历史上已经存在、但还没绑定独立密钥的自定义模型记录
- 运行时仍把“可聊天的自定义模型必须有 API Key”当作强约束

### `/api/chat`

当模型值为 `custom:<id>` 时：

- 查询当前用户的 `CustomModelConfig`
- 若不存在，返回 `400 Invalid model`
- 若存在但没有 `encryptedApiKey`，返回清晰错误
- 解密该模型自己的密钥
- 用 `baseUrl + modelId + apiKey` 构造 provider
- 不再读取 `provider = "custom-openai"` 的 `ApiKey`

### `/api/keys`

- 移除 `custom-openai` 作为可配置 provider 的产品入口
- 现有接口不再需要支持它的前端使用场景
- 保持对其他 provider 的兼容

## 前端交互

### API Keys 区域

- 从设置页 provider 列表中移除 `custom-openai`

### 自定义模型区域

- 表单字段改为：
  - 名称
  - Base URL
  - Model ID
  - API Key
- 新建时四项必填
- 编辑时 `API Key` 允许留空，表示不修改原密钥
- 列表项不显示明文 key，只显示“已配置密钥”状态

## 错误处理

- 自定义模型创建失败时返回明确的 `400`
- 聊天时如果自定义模型缺少密钥，返回“该自定义模型缺少 API Key，请在设置中重新保存”
- 未登录或越权场景保持原有 `401/400` 语义

## 测试策略

- 更新 API 路由测试，覆盖自定义模型创建、更新、聊天时读取独立 key 的行为
- 更新设置页组件测试，覆盖新增 `API Key` 字段和编辑保留旧 key 的交互
- 更新 provider/UI 测试，确认 `custom-openai` 不再出现在全局 API Key 列表

## 兼容策略

- 不做旧 `custom-openai` 数据自动迁移
- 已存在的自定义模型需要用户重新编辑并填写各自的 API Key
- 这是一次有意的产品语义修正，优先保证模型与密钥一一对应
