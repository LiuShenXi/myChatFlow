# ChatFlow

多模型 AI 对话平台，基于 Next.js 15、Prisma、NextAuth 和 Vercel AI SDK 构建，支持 OpenAI、Anthropic、DeepSeek 的模型切换与 BYOK API Key 加密存储。

## 当前状态

- 主线功能代码已经落地，自动化验证基线为 `TypeScript + Jest + ESLint + Next build`
- 当前优先事项不是继续扩展业务，而是完成本地联调收口
- 本仓库已经补齐本地联调入口：环境自检命令、串行验证命令、交接文档和浏览器验收清单

## 快速索引

- 联调设计文档：`docs/superpowers/specs/2026-04-12-chatflow-handoff-and-local-verification-design.md`
- 本次收口实现计划：`docs/superpowers/plans/2026-04-12-chatflow-local-verification-closeout.md`
- 下次开发交接说明：`docs/hand-off.md`
- 浏览器联调清单：`docs/local-qa-checklist.md`

## 本地启动顺序

1. 安装依赖：`npm install`
2. 复制环境模板：把 `.env.example` 复制为 `.env.local`
3. 填入真实环境变量：数据库、NextAuth、OAuth、`ENCRYPTION_KEY`
4. 运行环境自检：`npm run doctor`
5. 运行本地代码验证：`npm run verify:local`
6. 初始化数据库：`npx prisma generate`、`npx prisma db push`
7. 启动开发服务器：`npm run dev`
8. 按 `docs/local-qa-checklist.md` 做浏览器联调

## 常用命令

- `npm run doctor`
  - 读取 `.env.local` / `.env` 与当前 shell 环境
  - 区分“阻塞启动”与“阻塞真实联调”的环境问题
  - 给出下一步建议动作

- `npm run verify:local`
  - 串行执行 `npx tsc --noEmit`
  - 串行执行 `npm test -- --runInBand`
  - 串行执行 `npm run lint`
  - 串行执行 `npm run build`

- `npm run dev`
  - 启动本地开发服务器

## 环境变量清单

最少需要准备以下变量：

- `POSTGRES_PRISMA_URL`
- `POSTGRES_URL_NON_POOLING`
- `NEXTAUTH_URL`
- `NEXTAUTH_SECRET`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GITHUB_CLIENT_ID`
- `GITHUB_CLIENT_SECRET`
- `ENCRYPTION_KEY`

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

如果本地真实环境尚未准备好，先完成 `npm run doctor` 输出里的缺口；如果环境已经齐备，先执行 `npm run verify:local` 和浏览器联调，再决定是否进入下一轮功能开发。
