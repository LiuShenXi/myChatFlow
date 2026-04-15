# ChatFlow 核心文档包 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为 ChatFlow 建立一套稳定的项目主文档层，让读者无需先翻过程文档，也能完成“理解项目、跑起项目、定位代码入口”。

**Architecture:** 以 `README.md` 作为总入口，把长期有效的信息分流到 `project-overview`、`project-architecture`、`project-structure`、`development-guide`、`feature-map` 五份主文档；`hand-off` 和 `local-qa-checklist` 保留，但在定位上退回到交接层和验证层。

**Tech Stack:** Markdown、现有 `docs/` 目录、Next.js 15 项目结构、`rg`/`sed`/`git diff --check`、`npm run verify:local`

---

### Task 1: 重写 README 为项目总入口

**Files:**
- Modify: `README.md:1-141`
- Reference: `docs/superpowers/specs/2026-04-15-chatflow-core-docs-package-design.md`

- [ ] **Step 1: 先把 README 改成“入口页”结构**

```md
# ChatFlow

一个支持多模型切换、自定义模型与 BYOK 的 AI 对话平台。

## 项目状态

- 主线聊天能力已可用
- 已接入多家 provider
- 认证、会话、API Key 存储链路已打通
- 已提供本地环境自检和联调命令

## 快速开始

1. `npm install`
2. 复制 `.env.example` 到 `.env.local`
3. `npm run doctor`
4. `npx prisma generate`
5. `npx prisma db push`
6. `npm run verify:local`
7. `npm run dev`

## 文档地图

- 项目总览：`docs/project-overview.md`
- 系统架构：`docs/project-architecture.md`
- 目录结构：`docs/project-structure.md`
- 开发手册：`docs/development-guide.md`
- 功能地图：`docs/feature-map.md`
- 联调清单：`docs/local-qa-checklist.md`
- 阶段性交接：`docs/hand-off.md`
```

- [ ] **Step 2: 查看 README 顶层结构是否收敛成功**

Run: `sed -n '1,220p' README.md`
Expected: 只保留项目入口、快速开始、文档地图和阅读建议，不再堆叠大段实现细节

- [ ] **Step 3: 补上“推荐阅读顺序”和“当前能力摘要”**

```md
## 推荐阅读顺序

1. 先看 `docs/project-overview.md`
2. 再看 `docs/project-architecture.md`
3. 需要找代码时看 `docs/project-structure.md`
4. 需要启动项目时看 `docs/development-guide.md`
5. 需要确认当前功能边界时看 `docs/feature-map.md`
```

- [ ] **Step 4: 校验 README 已链接到新的主文档**

Run: `rg -n 'project-overview|project-architecture|project-structure|development-guide|feature-map' README.md`
Expected: 输出包含 5 个主文档文件名

- [ ] **Step 5: Commit**

```bash
git add README.md
git commit -m "docs: turn readme into docs hub"
```

### Task 2: 新增项目总览文档

**Files:**
- Create: `docs/project-overview.md`
- Reference: `README.md`, `docs/project-architecture.md`, `docs/hand-off.md`

- [ ] **Step 1: 新建项目总览文档骨架**

```md
# ChatFlow 项目总览

## 项目定位

## 核心使用场景

## 当前能力范围

## 当前不覆盖的范围

## 适合谁先看这份文档

## 推荐阅读路径
```

- [ ] **Step 2: 写入项目定位、使用场景和当前能力**

```md
## 项目定位

ChatFlow 是一个基于 Next.js 15 的单体全栈 AI 对话应用，重点验证多模型接入、BYOK、认证、会话管理和流式聊天这条主链路。

## 核心使用场景

- 用户登录后创建或自动获得首条会话
- 在设置页保存不同 provider 的 API Key
- 在模型选择器中切换模型并发起真实聊天
- 使用自定义模型配置扩展模型 ID 和 Base URL
```

- [ ] **Step 3: 补齐“当前边界”和“推荐阅读路径”**

```md
## 当前不覆盖的范围

- 细粒度权限系统
- 独立后端服务拆分
- 完整的生产部署运维说明
- 全量接口字段级文档

## 推荐阅读路径

1. 先从 `README.md` 进入
2. 需要理解整体实现时看 `docs/project-architecture.md`
3. 需要找代码时看 `docs/project-structure.md`
4. 需要启动和联调时看 `docs/development-guide.md`
```

- [ ] **Step 4: 检查文档标题与章节齐备**

Run: `rg -n '^#|^## ' docs/project-overview.md`
Expected: 输出覆盖“项目定位 / 核心使用场景 / 当前能力范围 / 当前不覆盖的范围 / 推荐阅读路径”

- [ ] **Step 5: Commit**

```bash
git add docs/project-overview.md
git commit -m "docs: add project overview"
```

### Task 3: 新增功能地图文档

**Files:**
- Create: `docs/feature-map.md`
- Reference: `README.md`, `docs/hand-off.md`, `src/app/api`, `src/components/settings`, `src/types/model.ts`

- [ ] **Step 1: 新建功能地图文档骨架**

```md
# ChatFlow 功能地图

## 认证与访问控制

## 会话能力

## 聊天能力

## Provider 与模型配置

## 自定义模型能力

## 多模态能力边界

## 当前限制
```

- [ ] **Step 2: 写清楚已经具备的主线能力**

```md
## 会话能力

- 登录后自动拉取当前用户会话
- 会话为空时自动创建首条会话
- 支持会话切换、重命名、删除

## 聊天能力

- 支持流式文本返回
- 支持 Markdown 与代码高亮渲染
- 支持按模型切换对应 provider
```

- [ ] **Step 3: 写清楚模型、自定义模型和边界**

```md
## Provider 与模型配置

- 当前已支持 `OpenAI`、`Anthropic`、`DeepSeek`、`Qwen`、`GLM`、`Kimi`、`豆包`
- API Key 由服务端加密持久化
- 模型选择器按模型元数据决定 provider 路由

## 多模态能力边界

- 仓库已存在图片上传和能力识别相关实现
- 当前主 README 不应再写成“完全不支持图片”
- 文档需要明确哪些能力已实现，哪些仍受 provider 能力限制
```

- [ ] **Step 4: 检查功能地图是否覆盖关键模块**

Run: `rg -n '认证|会话|聊天|Provider|自定义模型|多模态|限制' docs/feature-map.md`
Expected: 输出覆盖 6 个以上核心能力章节

- [ ] **Step 5: Commit**

```bash
git add docs/feature-map.md
git commit -m "docs: add feature map"
```

### Task 4: 新增目录结构文档

**Files:**
- Create: `docs/project-structure.md`
- Reference: `src/app`, `src/components`, `src/lib`, `src/store`, `src/types`, `prisma`, `scripts`, `__tests__`

- [ ] **Step 1: 新建目录结构文档骨架**

```md
# ChatFlow 目录结构说明

## 仓库顶层目录

## `src/app`

## `src/components`

## `src/lib`

## `src/store`

## `src/types`

## `prisma`

## `scripts`

## `__tests__`
```

- [ ] **Step 2: 写入仓库目录树与职责说明**

```md
## 仓库顶层目录

- `src/`：应用代码
- `docs/`：项目文档、设计文档、计划文档
- `prisma/`：数据库 schema
- `scripts/`：本地自检与验证脚本
- `__tests__/`：单元测试与脚本测试
```

- [ ] **Step 3: 补上关键入口文件定位**

```md
## 常见入口定位

- 聊天主页面：`src/app/(chat)/page.tsx`
- 聊天 API：`src/app/api/chat/route.ts`
- 会话 API：`src/app/api/sessions/route.ts`
- API Key 管理：`src/app/api/keys/route.ts`
- 模型适配：`src/lib/ai/providers.ts`
- 认证入口：`src/lib/auth/next-auth.ts`
```

- [ ] **Step 4: 校验文档中的目录名与真实仓库一致**

Run: `rg -n 'src/app|src/components|src/lib|src/store|src/types|prisma|scripts|__tests__' docs/project-structure.md`
Expected: 输出包含所有主目录名称且与仓库实际目录一致

- [ ] **Step 5: Commit**

```bash
git add docs/project-structure.md
git commit -m "docs: add project structure guide"
```

### Task 5: 更新系统架构文档

**Files:**
- Modify: `docs/project-architecture.md:1-260`
- Reference: `src/app/(chat)/page.tsx`, `src/app/api/chat/route.ts`, `src/app/api/sessions/route.ts`, `src/app/api/keys/route.ts`, `src/app/api/custom-models/route.ts`, `src/lib/ai/providers.ts`, `src/lib/ai/stream-handler.ts`, `src/lib/auth/*`, `src/store/*`

- [ ] **Step 1: 保留现有文档主结构，但删掉不再准确或重复的表述**

```md
## 文档目标

本文档只回答实现层问题：

- 系统由哪些模块构成
- 一条聊天请求经过哪些环节
- 认证、会话、模型路由和落库如何协作
- 后续扩展应该从哪里入手
```

- [ ] **Step 2: 校正目录与模块说明，使其与真实代码一致**

```md
## 目录与模块职责

- `src/app`：页面与 Route Handlers 入口
- `src/components`：布局、聊天、会话、设置与基础 UI
- `src/hooks`：如 `useImageUpload`
- `src/lib/ai`：provider 适配、能力判断、流式处理
- `src/lib/auth`：NextAuth 配置与密钥加解密
- `src/lib/chat`：消息片段转换
- `src/store`：客户端共享状态
- `src/types`：模型元数据、聊天相关类型
```

- [ ] **Step 3: 补强关键链路说明，并移除不该放在架构文档里的开发手册内容**

```md
## 核心链路

1. 用户打开聊天页，客户端读取 `useSession()`
2. 已登录时拉取 `/api/sessions`，必要时自动创建首条会话
3. 发送消息时调用 `/api/chat`
4. 服务端根据模型元数据确定 provider 与 API Key
5. `streamText` 返回流式响应
6. 完成后把用户消息与助手消息持久化到数据库
```

- [ ] **Step 4: 检查架构文档中引用的路径是否真实存在**

Run: `rg -n 'src/app|src/components|src/hooks|src/lib|src/store|src/types|prisma/schema.prisma' docs/project-architecture.md`
Expected: 输出的路径都能在仓库中找到，不再出现不存在的旧文件名

- [ ] **Step 5: Commit**

```bash
git add docs/project-architecture.md
git commit -m "docs: align project architecture with codebase"
```

### Task 6: 新增开发手册并调整交接文档定位

**Files:**
- Create: `docs/development-guide.md`
- Modify: `docs/hand-off.md:1-260`
- Reference: `package.json`, `scripts/doctor.cjs`, `scripts/verify-local.cjs`, `docs/local-qa-checklist.md`

- [ ] **Step 1: 新建开发手册骨架**

```md
# ChatFlow 开发手册

## 本地准备

## 环境变量

## 数据库初始化

## 常用命令

## 推荐联调顺序

## 浏览器联调入口
```

- [ ] **Step 2: 把长期有效的开发信息沉淀到开发手册**

```md
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
```

- [ ] **Step 3: 在交接文档开头补上定位说明，避免它继续充当主文档**

```md
> 本文档用于阶段性交接和上下文续接，不替代项目主文档。
> 如果你是第一次进入仓库，请优先阅读 `README.md`、`docs/project-overview.md`、`docs/project-architecture.md`、`docs/project-structure.md`、`docs/development-guide.md`。
```

- [ ] **Step 4: 检查开发手册与交接文档的边界是否清晰**

Run: `rg -n '阶段性交接|项目主文档|development-guide|local-qa-checklist' docs/development-guide.md docs/hand-off.md`
Expected: `development-guide` 负责长期开发说明，`hand-off` 明确为阶段性交接文档

- [ ] **Step 5: Commit**

```bash
git add docs/development-guide.md docs/hand-off.md
git commit -m "docs: add development guide and scope handoff"
```

### Task 7: 全链路交叉检查与最终验证

**Files:**
- Modify: `README.md`, `docs/project-overview.md`, `docs/feature-map.md`, `docs/project-structure.md`, `docs/project-architecture.md`, `docs/development-guide.md`, `docs/hand-off.md`

- [ ] **Step 1: 做一次主文档链接巡检**

Run: `rg -n 'project-overview|project-architecture|project-structure|development-guide|feature-map|local-qa-checklist|hand-off' README.md docs/*.md`
Expected: README 和主文档之间存在稳定互链，没有孤立文档

- [ ] **Step 2: 检查 Markdown 是否有明显格式问题**

Run: `git diff --check -- README.md docs/project-overview.md docs/feature-map.md docs/project-structure.md docs/project-architecture.md docs/development-guide.md docs/hand-off.md`
Expected: 无 trailing whitespace、无冲突标记、无 patch 格式错误

- [ ] **Step 3: 运行项目标准验证命令**

Run: `npm run verify:local`
Expected: TypeScript、Jest、ESLint、Next build 全部通过

- [ ] **Step 4: 做最终内容回看，确认没有主文档/交接文档角色混淆**

```md
最终检查口径：

- `README.md` 只做入口
- `project-overview` 讲项目是什么
- `project-architecture` 讲系统如何工作
- `project-structure` 讲代码在哪
- `development-guide` 讲怎么启动和联调
- `feature-map` 讲当前做到哪里
- `hand-off` 只保留阶段性交接信息
```

- [ ] **Step 5: Commit**

```bash
git add README.md docs/project-overview.md docs/feature-map.md docs/project-structure.md docs/project-architecture.md docs/development-guide.md docs/hand-off.md
git commit -m "docs: deliver core project documentation package"
```
