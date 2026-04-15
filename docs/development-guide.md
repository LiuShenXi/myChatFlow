# ChatFlow 开发手册

## 本地准备

- 首次进入仓库先安装依赖：`npm install`
- 本仓库没有 `.env.example`，请手动准备 `.env.local` 或 `.env`
- 本地数据库准备好后，先执行 `npx prisma generate` 和 `npx prisma db push`
- 开发前建议先跑 `npm run doctor`，再跑 `npm run verify:local`

## 环境变量

`npm run doctor` 会检查以下环境变量：

- 启动必需：
  - `POSTGRES_PRISMA_URL`
  - `POSTGRES_URL_NON_POOLING`
  - `NEXTAUTH_URL`
  - `NEXTAUTH_SECRET`
  - `ENCRYPTION_KEY`
- 真实联调还需要：
  - `GOOGLE_CLIENT_ID`
  - `GOOGLE_CLIENT_SECRET`
  - `GITHUB_CLIENT_ID`
  - `GITHUB_CLIENT_SECRET`

补充要求：

- `POSTGRES_PRISMA_URL` 和 `POSTGRES_URL_NON_POOLING` 需要是 `postgres://` 或 `postgresql://`
- `NEXTAUTH_URL` 需要是 `http://` 或 `https://`
- `ENCRYPTION_KEY` 需要是 64 位十六进制字符串

## 数据库初始化

1. 配好数据库相关环境变量
2. 执行 `npx prisma generate`
3. 执行 `npx prisma db push`
4. 如果 schema 有变化，重新执行上面两步

## 常用命令

- `npm run doctor`：检查环境缺口
- `npm run verify:local`：串行执行类型、测试、Lint、构建验证
- `npm run dev`：启动开发服务器

## 推荐联调顺序

1. `npm install`
2. `npm run doctor`
3. `npx prisma generate`
4. `npx prisma db push`
5. `npm run verify:local`
6. `npm run dev`
7. 打开浏览器并按 `docs/local-qa-checklist.md` 逐项验证

## 浏览器联调入口

- 默认入口：`http://localhost:3000`
- 浏览器联调清单：`docs/local-qa-checklist.md`
- 如果出现 `_next/static` 资源异常，先重启 `npm run dev`，必要时清理 `.next` 后再试
