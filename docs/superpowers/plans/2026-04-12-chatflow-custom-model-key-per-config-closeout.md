# ChatFlow Custom Model Key Per Config Closeout

## 背景

本次收尾对应分支：`feature/custom-model-key-per-config`

目标是修正“自定义模型共用一把 `custom-openai` 全局密钥”的错误设计，把模型与密钥关系改为一一对应。

## 本次完成内容

### 1. 数据模型

- `CustomModelConfig` 新增 `encryptedApiKey`
- 数据库层采用过渡期可空字段：`String? @db.Text`
- 运行时仍然强制要求可用的自定义模型必须具备自己的 API Key

### 2. 后端接口

- `POST /api/custom-models` 改为创建时必须提交 `apiKey`
- `PATCH /api/custom-models/[id]` 支持可选更新 `apiKey`
- `GET /api/custom-models` 和 `PATCH/POST` 返回公开 DTO，不暴露明文密钥
- DTO 新增 `hasApiKey`
- `POST /api/chat` 命中 `custom:<id>` 时，直接解密该模型自己的 `encryptedApiKey`
- 移除对 `provider = "custom-openai"` 全局 key 的依赖

### 3. 前端交互

- 设置页 `API Keys` 区域移除了 `custom-openai`
- `CustomModelManager` 新增独立 `API Key` 输入框
- 新建自定义模型时 `API Key` 必填
- 编辑自定义模型时允许留空 `API Key`，表示保留旧值
- 模型列表新增“已配置密钥”状态展示

### 4. 测试与文档

- 更新了自定义模型 API 路由测试
- 更新了聊天路由测试
- 更新了设置页组件测试
- 更新了 provider / keys 测试
- 新增本次设计文档与实施计划

## 关键设计决策

### 为什么不再保留 `custom-openai`

原方案会把不同平台、不同账号、不同网关错误地压缩成“多模型共享一把 key”，这与真实使用场景冲突。当前方案将自定义模型视为完整配置单元：

- `name`
- `baseUrl`
- `modelId`
- `apiKey`

这样智谱、Qwen、任意自建 OpenAI-compatible 网关都可以并存，并分别绑定自己的密钥。

### 为什么 `encryptedApiKey` 暂时允许为空

数据库里已有历史自定义模型记录。如果把该列直接改成非空，`prisma db push` 会因为现存数据无法自动回填而失败。

因此本次采用兼容过渡策略：

- schema 允许 `encryptedApiKey` 为空
- 聊天运行时一旦发现为空，直接返回明确错误，提示用户重新保存该模型

这样既能让数据库平滑升级，也不会把缺密钥的旧模型默默当成可用配置。

## 验证证据

在本分支工作树中完成了以下验证：

- `npx prisma generate`
- `npx prisma db push`
- `npx tsc --noEmit`
- `npm test -- --runInBand`
- `npm run lint`
- `npm run build`
- `npm run verify:local`

最终结果：

- `26/26` 个测试套件通过
- `123/123` 个测试通过
- TypeScript 通过
- ESLint 通过
- Next.js build 通过

## 人工回归建议

建议在浏览器中至少验证以下路径：

1. 设置页确认不再出现 `custom-openai`
2. 新建智谱自定义模型时，必须填写自己的 `API Key`
3. 再新建一个 Qwen 自定义模型，使用另一把不同的 key
4. 分别切换两个自定义模型发起对话
5. 编辑已有模型但不填写 `API Key`，确认旧 key 仍可用
6. 对历史缺失 key 的自定义模型，确认聊天时报错明确

## 待集成状态

- 当前代码尚未提交合并到 `main`
- 当前工作树路径：`C:\WORK-SPACE\myChatFlow\.worktrees\custom-model-key-per-config`
- 当前分支：`feature/custom-model-key-per-config`

## 推荐下一步

1. 提交本分支代码
2. 若无额外人工反馈，合并回 `main`
3. 合并后重新启动主工作区服务做一次最终冒烟验证
