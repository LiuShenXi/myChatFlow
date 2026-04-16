# ChatFlow

一个支持多模型切换、自定义模型与 BYOK 的 AI 对话平台。

## 项目状态

- 主线聊天能力已可用
- 已接入多家 provider
- 认证、会话、API Key 存储链路已打通
- 已提供本地环境自检和联调命令

## 当前能力摘要

- 登录后可创建和管理会话
- 可在设置中保存 provider API Key，并按模型切换当前对话能力
- 支持本地自检、数据库初始化和联调验证；README 只负责做入口导航

## 快速开始

1. `npm install`
2. 先看 [开发手册](docs/development-guide.md)，完成环境变量和数据库准备
3. `npm run doctor`
4. `npx prisma generate`
5. `npx prisma db push`
6. `npm run verify:local`
7. `npm run dev`

## 文档地图

- [项目总览](docs/project-overview.md)
- [系统架构](docs/project-architecture.md)
- [目录结构](docs/project-structure.md)
- [开发手册](docs/development-guide.md)
- [功能地图](docs/feature-map.md)
- [联调清单](docs/local-qa-checklist.md)
- [阶段性交接](docs/hand-off.md)

## 推荐阅读顺序

1. 先看 [项目总览](docs/project-overview.md)
2. 再看 [系统架构](docs/project-architecture.md)
3. 需要找代码时看 [目录结构](docs/project-structure.md)
4. 需要启动项目时看 [开发手册](docs/development-guide.md)
5. 需要确认当前功能边界时看 [功能地图](docs/feature-map.md)
需要联调时看 [联调清单](docs/local-qa-checklist.md)；需要接手阶段性上下文时看 [阶段性交接](docs/hand-off.md)。
