# ChatFlow 本地联调交接说明

## 当前项目状态

- ChatFlow 主线功能已经完成到可交付基础状态
- 自动化验证基线已经固定为：
  - `npx tsc --noEmit`
  - `npm test -- --runInBand`
  - `npm run lint`
  - `npm run build`
- 当前真正未闭环的是“真实环境联调”，不是功能开发
- 下一次进入仓库时，优先完成本地环境准备、浏览器联调和结果归档，再决定是否继续新需求

## 开始前检查

第一次进入仓库，建议按下面顺序确认：

1. 先看 `docs/superpowers/specs/2026-04-12-chatflow-handoff-and-local-verification-design.md`
2. 再看本文件，确认当前收口目标与执行顺序
3. 检查是否存在 `.env.local`
4. 运行 `npm install`
5. 运行 `npm run doctor`

如果 `npm run doctor` 仍显示启动阻塞项，就不要先跑浏览器联调。

## 环境变量准备

从 `.env.example` 复制生成 `.env.local`，至少填入以下变量：

- `POSTGRES_PRISMA_URL`
- `POSTGRES_URL_NON_POOLING`
- `NEXTAUTH_URL`
- `NEXTAUTH_SECRET`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GITHUB_CLIENT_ID`
- `GITHUB_CLIENT_SECRET`
- `ENCRYPTION_KEY`

建议值：

- `NEXTAUTH_URL=http://localhost:3000`
- `NEXTAUTH_SECRET` 使用 `openssl rand -base64 32` 生成
- `ENCRYPTION_KEY` 使用 `openssl rand -hex 32` 生成，必须是 64 位十六进制字符串

环境自检规则：

- 启动阻塞项：数据库连接、`NEXTAUTH_URL`、`NEXTAUTH_SECRET`、`ENCRYPTION_KEY`
- 真实联调阻塞项：Google/GitHub OAuth 变量

## 数据库准备

本地数据库最少要满足：

- PostgreSQL 实例可连通
- `POSTGRES_PRISMA_URL` 与 `POSTGRES_URL_NON_POOLING` 对应同一个库
- 当前用户拥有建表/更新 schema 的权限

推荐命令顺序：

1. `npx prisma generate`
2. `npx prisma db push`
3. 如需查看数据，可选执行 `npx prisma studio`

如果 Prisma 命令失败，优先检查：

- `.env.local` 中的数据库连接串是否填写完整
- 数据库实例是否允许当前来源 IP 或本机访问
- 连接串中的数据库名、用户名、密码是否正确

## OAuth 准备

至少准备一个可用的登录 Provider，推荐 Google 和 GitHub 都配好。

本地回调地址建议：

- Google 回调：`http://localhost:3000/api/auth/callback/google`
- GitHub 回调：`http://localhost:3000/api/auth/callback/github`

排查优先级：

1. 先确认 Provider 控制台里配置的回调地址和本地地址完全一致
2. 再确认 `.env.local` 中的 Client ID / Secret 与控制台一致
3. 最后再检查浏览器控制台和终端里的 NextAuth 报错

## 启动项目

推荐执行顺序：

1. `npm run doctor`
2. `npm run verify:local`
3. `npx prisma generate`
4. `npx prisma db push`
5. `npm run dev`

如果 `npm run verify:local` 在任一步失败，先修复失败项，不要跳过继续联调。

## 浏览器联调路径

推荐从以下路径开始：

1. 访问 `http://localhost:3000/login`
2. 验证登录页展示正常
3. 先完成至少一个 OAuth Provider 登录
4. 进入主界面后创建新对话
5. 打开设置面板保存至少一个 Provider API Key
6. 切换到对应模型并发送消息
7. 验证会话切换、重命名、删除和退出登录

完整清单见 `docs/local-qa-checklist.md`。

## 常见问题排查

### 环境类

- 症状：`npm run doctor` 显示缺失项
- 先看：`.env.local`
- 再看：`scripts/doctor.cjs`

### Prisma / 构建类

- 症状：`prisma generate`、`db push`、`next build` 失败
- 先看：终端报错中的数据库连接或类型错误
- 再跑：`npm run verify:local`

### 认证类

- 症状：登录页能打开，但 OAuth 跳转或回调失败
- 先看：`.env.local` 中的 Provider 变量
- 再看：OAuth 控制台的回调地址配置

### 运行类

- 症状：登录成功后无法保存 API Key、无法发送消息、模型切换异常
- 先看：浏览器 Network 面板中的 `/api/keys`、`/api/chat`、`/api/sessions`
- 再看：终端中的服务端报错

## 收口标准

满足以下条件后，才算完成本地联调收口：

1. `npm run doctor` 不再出现启动阻塞项
2. `npm run verify:local` 全部通过
3. 至少完成 `docs/local-qa-checklist.md` 中的最低通过标准
4. 联调过程中发现的新问题被记录到下一轮任务里，而不是直接开始扩需求
