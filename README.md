# ChatFlow

一个支持多模型切换与 BYOK 的 AI 对话平台，基于 Next.js 15、Prisma、NextAuth 和 Vercel AI SDK 构建。当前已支持 `OpenAI`、`Anthropic`、`DeepSeek`、`Qwen`、`GLM`、`Kimi`、`豆包`。

## 当前状态

- 主线功能代码已经落地
- 本地联调收口包已经补齐，包括环境自检、串行验证命令、交接文档和联调清单
- 认证链路已打通到本地登录阶段
- 文本对话模型已扩展到主流国产 provider，可在设置页保存 API Key，并在模型选择器里切换
- 未登录时，页面会显示提示与登录入口，不再静默失败
- 登录后如果账号下还没有任何会话，系统会自动创建第一条会话

## 快速索引

- 联调设计文档：`docs/superpowers/specs/2026-04-12-chatflow-handoff-and-local-verification-design.md`
- 国产 provider 扩展设计：`docs/superpowers/specs/2026-04-12-chatflow-domestic-provider-expansion-design.md`
- 未登录提示与自动会话设计：`docs/superpowers/specs/2026-04-12-chatflow-auth-aware-ux-and-auto-session-design.md`
- 本地联调收口计划：`docs/superpowers/plans/2026-04-12-chatflow-local-verification-closeout.md`
- 国产 provider 扩展计划：`docs/superpowers/plans/2026-04-12-chatflow-domestic-provider-expansion.md`
- 未登录提示与自动会话计划：`docs/superpowers/plans/2026-04-12-chatflow-auth-aware-ux-and-auto-session.md`
- 开发交接说明：`docs/hand-off.md`
- 浏览器联调清单：`docs/local-qa-checklist.md`

## 本地启动顺序

1. 安装依赖：`npm install`
2. 准备环境文件：复制 `.env.example` 到 `.env.local`
3. 填入必要环境变量：数据库、NextAuth、OAuth、`ENCRYPTION_KEY`
4. 运行环境自检：`npm run doctor`
5. 初始化数据库：`npx prisma generate`、`npx prisma db push`
6. 运行本地验证：`npm run verify:local`
7. 启动开发服务：`npm run dev`
8. 按 `docs/local-qa-checklist.md` 做浏览器联调

## 模型与 Key 配置

设置页当前支持以下 provider：

- `OpenAI`
- `Anthropic`
- `DeepSeek`
- `Qwen`
- `GLM`
- `Kimi`
- `豆包`

当前模型列表包含：

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

说明：

- 本阶段只接入文本聊天链路
- 视觉模型、多模态、联网搜索和厂商专属高级参数暂未开放
- 聊天时会按所选模型自动读取对应 provider 的 API Key
- 未登录时可以浏览页面，但不能创建会话、发送消息或保存密钥

## 未登录与会话初始化

- Header 会在未登录时显示“登录”按钮
- 设置弹窗会在未登录时显示说明与登录入口
- 会话抽屉会在未登录时显示说明，不会再静默请求失败
- 聊天主区会在未登录时提示“登录后即可开始对话”
- 登录后如果还没有任何会话，系统会自动创建一条新会话并激活输入框

## 常用命令

- `npm run doctor`
  - 读取 `.env.local` / `.env` 与当前 shell 环境
  - 区分“阻塞启动”和“阻塞真实联调”的环境缺口
  - 给出下一步修复建议

- `npm run verify:local`
  - 串行执行 `npx tsc --noEmit`
  - 串行执行 `npm test -- --runInBand`
  - 串行执行 `npm run lint`
  - 串行执行 `npm run build`

- `npm run dev`
  - 启动本地开发服务器

## 环境变量

至少需要准备：

- `POSTGRES_PRISMA_URL`
- `POSTGRES_URL_NON_POOLING`
- `NEXTAUTH_URL`
- `NEXTAUTH_SECRET`
- `ENCRYPTION_KEY`

如需启用 OAuth：

- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GITHUB_CLIENT_ID`
- `GITHUB_CLIENT_SECRET`

生成建议：

- `NEXTAUTH_SECRET`：`openssl rand -base64 32`
- `ENCRYPTION_KEY`：`openssl rand -hex 32`

## 技术栈

- Next.js 15 App Router
- React 19
- TypeScript
- Prisma + PostgreSQL
- NextAuth v5 beta
- Vercel AI SDK
- Zustand
- Tailwind CSS

## 下一步建议

如果你准备继续联调：

1. 先登录账号
2. 在设置页配置至少一个可用 provider 的 API Key
3. 等系统自动准备好首条会话
4. 进入聊天页切换到对应模型
5. 发送一条真实消息，确认流式返回和消息落库都正常

如果你准备继续扩展：

1. 增加自定义模型 ID / Base URL
2. 补齐豆包 endpoint 管理
3. 接入视觉模型与图片上传
