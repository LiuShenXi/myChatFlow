# ChatFlow 本地联调交接说明

## 本次已完成工作

### 1. 本地联调收口包

- 新增 `npm run doctor`
  - 检查 `.env.local` / `.env`
  - 区分“启动阻塞项”和“真实联调阻塞项”
- 新增 `npm run verify:local`
  - 串行执行 `npx tsc --noEmit`
  - 串行执行 `npm test -- --runInBand`
  - 串行执行 `npm run lint`
  - 串行执行 `npm run build`
- 新增文档
  - `docs/local-qa-checklist.md`
  - `docs/superpowers/specs/2026-04-12-chatflow-handoff-and-local-verification-design.md`
  - `docs/superpowers/plans/2026-04-12-chatflow-local-verification-closeout.md`

### 2. 认证链路与登录页修复

- 修复 `UntrustedHost`
  - 在 `src/lib/auth/auth.config.ts` 中加入 `trustHost: true`
- 修复未配置 provider 也被注册的问题
  - 现在只有真正配置完整的 OAuth provider 才会注册
- 将登录页改为客户端触发 `signIn`
  - 相关组件：`src/components/auth/LoginActions.tsx`
- 本地 Google 登录已打通到系统首页

相关设计与测试：

- `__tests__/lib/auth/auth.config.test.ts`
- `__tests__/components/auth/LoginActions.test.tsx`

### 3. 国产模型 provider 扩展

当前项目已支持以下 provider：

- `OpenAI`
- `Anthropic`
- `DeepSeek`
- `Qwen`
- `GLM`
- `Kimi`
- `豆包`

当前模型列表已扩展到：

- `GPT-4`
- `GPT-4o`
- `Claude 3.5 Sonnet`
- `DeepSeek Chat`
- `Qwen Plus`
- `Qwen Turbo`
- `GLM-5`
- `GLM-4.7`
- `Kimi Moonshot v1 8K`
- `Kimi K2`
- `豆包 Seed 1.6`
- `豆包 Seed 1.6 Flash`

实现方式：

- 将 `DeepSeek / Qwen / GLM / Kimi / 豆包` 统一收口到 OpenAI-compatible provider 注册表
- `Anthropic` 仍保留独立实现
- 设置页与模型选择器已支持新增 provider / model

相关文档：

- `docs/superpowers/specs/2026-04-12-chatflow-domestic-provider-expansion-design.md`
- `docs/superpowers/plans/2026-04-12-chatflow-domestic-provider-expansion.md`

### 4. 未登录提示与自动会话初始化

已完成以下交互修复：

- 未登录时，Header 显示“登录”按钮
- 未登录时，设置弹窗显示“登录后才能配置 API Key”
- 未登录时，会话抽屉显示“登录后才能查看和创建会话”
- 未登录时，聊天主区显示“登录后即可开始对话”
- 已登录但没有任何会话时，系统会自动创建第一条会话
- 修复“已配置 Key 但输入框仍禁用”的问题

相关组件：

- `src/components/auth/AuthPrompt.tsx`
- `src/components/layout/Header.tsx`
- `src/components/settings/SettingsDialog.tsx`
- `src/components/session/SessionDrawer.tsx`
- `src/app/(chat)/page.tsx`

相关文档：

- `docs/superpowers/specs/2026-04-12-chatflow-auth-aware-ux-and-auto-session-design.md`
- `docs/superpowers/plans/2026-04-12-chatflow-auth-aware-ux-and-auto-session.md`

### 5. 图片多模态闭环与流式兼容修复

已完成以下多模态收口：

- 聊天页发送时，图片会转换为 AI SDK `experimental_attachments`
- 后端会从用户消息中提取图片并持久化到 `Message.images[]`
- 会话历史加载时，会把数据库里的图片重新映射回 UI message
- 用户消息卡片新增图片缩略图展示
- 模型选择器明确区分支持视觉与纯文本模型
- 自定义模型默认允许图片输入，避免误拦截

同时修复了一处真实报错：

- 带图请求若携带历史 assistant `parts[].type === "step-start"`，`ai@4.3.16` 在转换模型输入时会报错
- 现在已在 `src/lib/chat/message-parts.ts` 中增加 `sanitizeMessagesForModelInput`
- `/api/chat` 在调用 `streamText` 前会先清洗该类 part
- 图片附件本身保持不变，因此不会破坏多模态链路

相关实现与测试：

- `src/lib/chat/message-parts.ts`
- `src/app/api/chat/route.ts`
- `src/app/(chat)/page.tsx`
- `src/components/chat/InputArea.tsx`
- `src/components/chat/MessageItem.tsx`
- `__tests__/lib/chat/message-parts.test.ts`
- `__tests__/app/api/chat/route.test.ts`
- `__tests__/app/chat-page.test.tsx`
- `__tests__/components/chat/InputArea.test.tsx`
- `__tests__/components/chat/MessageItem.test.tsx`
- `docs/superpowers/plans/2026-04-13-chatflow-multimodal-closeout.md`

## 当前验证状态

最新一次已完成：

- `npm test -- --runInBand`

结果：

- Jest：通过
- 共 `29` 个 test suites、`146` 个 tests 全部通过

## 当前工作区状态

当前仓库里存在尚未提交的改动，主要包括：

- OAuth 与登录页修复
- 国产 provider 扩展
- 未登录提示与自动会话初始化
- 图片多模态闭环与 `step-start` 兼容修复
- 对应测试
- README 与 superpowers 设计/计划文档

注意：

- `.env` / `.env.local` 为本地忽略文件，不会进入 git
- 当前仓库可能仍处于“有本地未提交改动”的联调状态
- 不要用破坏性命令清空工作区

## 当前已知事实

### 1. API Key 是服务端持久化的

当前不是浏览器内存临时保存，而是：

- 前端 `POST /api/keys`
- 服务端用 `ENCRYPTION_KEY` 加密
- 加密后写入数据库 `ApiKey`
- 刷新页面后通过 `GET /api/keys` 重新读取 provider 状态

所以正常情况下，保存成功后不需要每次刷新重新配置。

### 2. API 未登录返回 `401` 是预期行为

当前页面路由不强制跳转登录页，但 API 保持标准语义：

- 页面可以打开
- `/api/keys`、`/api/sessions`、`/api/chat` 未登录时返回 `401`
- 现在前端已补齐明确提示，不再是静默失败

### 3. 输入框之前长期禁用的根因

之前输入框禁用依赖 `currentSessionId`，而系统不会自动创建首条会话。现在已修复为：

- 登录后若没有会话，自动创建一条
- 当前会话准备好后输入框自动可用

### 4. dev server 资源 404 的根因

之前多次出现：

- `/_next/static/... 404`
- 页面按钮失效
- `layout.js` / `page.js` / `main-app.js` 404

根因是：

- `next dev` 在编译时出现模块找不到或缓存脏状态
- 首页 HTML 与 `_next/static` 虚拟资源不匹配

已知有效修复方式：

1. 停掉当前 `localhost:3000` 的 dev 进程
2. 删除 `.next`
3. 重新执行 `npm run dev`
4. 浏览器强刷：`Ctrl+Shift+R`

### 5. 多模态链路的当前事实

- 数据库存储仍沿用 `Message.content + Message.images[]`
- 前后端传输使用 AI SDK `experimental_attachments`
- 历史消息回显不是直接读 `attachments`，而是通过 `mapStoredMessageToUiMessage` 重新构造
- 当前后端都做了“模型是否支持图片输入”的防线
- 自定义模型当前按“默认支持图片”处理，如果后续要更严谨，可再引入显式能力开关

## 当前联调建议路径

如果下一个会话要继续联调，请按这个顺序走：

1. `npm install`
2. `npm run doctor`
3. `npm run verify:local`
4. `npx prisma generate`
5. `npx prisma db push`
6. `npm run dev`
7. 打开 `http://localhost:3000`
8. 如果页面资源异常，先重启 dev server 并清 `.next`
9. 登录账号
10. 在设置页配置至少一个 provider 的 API Key
11. 等系统自动创建首条会话
12. 发送一条真实消息验证对话链路
13. 如果要验证多模态，补做一轮“支持视觉模型发送图片 / 不支持视觉模型被阻止 / 刷新后图片仍回显”

## 下次新会话如何用 superpowers 开展工作

下一次开新会话时，建议严格按以下 superpowers 流程：

### A. 进入会话后的第一句话

明确要求继续使用 superpowers，并让助手先读这些文件：

- `docs/hand-off.md`
- `README.md`
- `docs/superpowers/specs/2026-04-12-chatflow-handoff-and-local-verification-design.md`
- `docs/superpowers/specs/2026-04-12-chatflow-domestic-provider-expansion-design.md`
- `docs/superpowers/specs/2026-04-12-chatflow-auth-aware-ux-and-auto-session-design.md`
- `docs/superpowers/specs/2026-04-12-chatflow-multimodal-design.md`
- `docs/superpowers/plans/2026-04-13-chatflow-multimodal-closeout.md`

### B. 如果是继续开发功能

要求助手按：

1. `using-superpowers`
2. `brainstorming`
3. `writing-plans`
4. `executing-plans`

的顺序推进。

不要跳过设计和计划，哪怕需求看起来很小。

### C. 如果是排查 bug

要求助手先用：

- `systematic-debugging`

然后再进入修复。

不要允许直接“猜一个修复先试试”。

### D. 如果要改代码

要求助手：

- 先走 TDD
- 使用 `apply_patch` 改文件
- 完成后必须跑 `npm run verify:local`

对应 skills：

- `test-driven-development`
- `verification-before-completion`

### E. 建议的新会话提示词

可以直接复制下面这段作为下次开工提示：

```text
继续接手 ChatFlow，本次必须使用 superpowers 流程管理。
先阅读 docs/hand-off.md、README.md 和 docs/superpowers/specs 下 2026-04-12 的 3 份 design 文档，
再汇总当前状态与未完成事项。
如果是新功能，先走 brainstorming -> writing-plans -> executing-plans；
如果是 bug，先走 systematic-debugging；
所有代码修改必须用 apply_patch，完成前必须跑 npm run verify:local。
```

## 下一轮优先事项建议

如果继续开发，我建议优先顺序如下：

1. 验证“保存 API Key -> 刷新后仍显示已配置 -> 成功发出第一条真实对话”
2. 做一轮浏览器图片多模态冒烟回归，确认历史带图会话不再触发 `"An error occurred."`
3. 确认 `豆包` 是否需要补“endpoint-id 模式”
3. 视情况补“登录后首页自动聚焦到可用输入状态”的细节优化
4. 再考虑视觉模型、多模态、自定义模型 ID / Base URL

## 不要遗漏的注意事项

- 用户要求全程中文
- 用户要求尽量使用 superpowers 管理全过程
- 当前工作区可能是脏的，不要擅自回退已有改动
- 不要使用 `git reset --hard`、`git checkout --` 这类破坏性命令
- 如果 dev server 出现奇怪的 `_next/static` 404，优先怀疑 `.next` 和 dev 进程状态
