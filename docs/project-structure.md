# ChatFlow 目录结构说明

本文档的目标是回答“代码应该去哪里找”。它更偏向仓库导航和目录定位，不重复展开完整架构链路。

## 仓库顶层目录

- `src/`：应用代码
- `docs/`：项目文档、设计文档、计划文档
- `prisma/`：数据库 schema
- `scripts/`：本地自检与验证脚本
- `__tests__/`：单元测试与脚本测试

## `src/app`

这里是页面路由和 API 路由的入口层，负责把应用真正“跑起来”。

- `src/app/layout.tsx`：根布局
- `src/app/(chat)/layout.tsx`：聊天区布局
- `src/app/(chat)/page.tsx`：聊天主页面
- `src/app/(auth)/layout.tsx`：认证相关布局
- `src/app/(auth)/login/page.tsx`：登录页
- `src/app/api/*`：后端接口路由

## `src/components`

这里是 UI 组件层，按功能域拆分，主要放页面上能直接复用的交互组件。

- `layout/`：顶部栏、页面壳子等布局组件
- `session/`：会话抽屉、会话项等会话管理组件
- `chat/`：输入区、消息列表、消息渲染等聊天组件
- `settings/`：模型选择、API Key 管理、自定义模型管理
- `auth/`：登录态提示与登录动作
- `ui/`：基础 UI 组件

## `src/lib`

这里放业务核心逻辑和可复用工具，通常是 API 路由和页面组件真正依赖的地方。

- `lib/auth/`：认证配置、`auth()` 封装、密钥加解密
- `lib/ai/`：模型适配、流式返回、provider 相关逻辑
- `lib/db/`：Prisma Client 单例
- `lib/chat/`：聊天消息和附件处理
- `lib/utils.ts`：通用工具函数

## `src/store`

这里是前端状态管理层，主要放页面级共享状态和交互状态。

- `session-store.ts`：当前会话、会话列表相关状态
- `chat-store.ts`：聊天交互辅助状态
- `settings-store.ts`：设置页与界面配置状态

## `src/types`

这里放前后端共享的类型定义，以及和模型能力、认证声明相关的类型补充。

- `model.ts`：模型与 provider 相关类型
- `chat.ts`：聊天消息相关类型
- `next-auth.d.ts`：NextAuth 类型扩展

## `src/hooks`

这里放可复用的 React hook，通常用于封装单个交互能力。

- `useImageUpload.ts`：图片上传与图片消息相关的前端逻辑

## `prisma`

这里是数据库结构定义和迁移相关入口。

- `schema.prisma`：数据库 schema 和数据模型定义

## `scripts`

这里放本地自检、环境验证和辅助维护脚本，通常用于开发期和提交流程前检查。

- `doctor.cjs`：环境与依赖自检
- `verify-local.cjs`：本地验证脚本

## `__tests__`

这里是测试代码主目录，结构和 `src/` 保持大体对应，方便按模块找测试。

- `components/`：组件测试
- `app/`：页面和 API 测试
- `lib/`：核心逻辑测试
- `store/`：状态管理测试
- `hooks/`：hook 测试
- `scripts/`：脚本测试
- `types/`：类型相关测试

## 常见入口定位

- 聊天主页面：`src/app/(chat)/page.tsx`
- 聊天 API：`src/app/api/chat/route.ts`
- 会话 API：`src/app/api/sessions/route.ts`
- API Key 管理：`src/app/api/keys/route.ts`
- 模型适配：`src/lib/ai/providers.ts`
- 认证入口：`src/lib/auth/next-auth.ts`

## 找代码时的快速提示

- 想找“页面从哪里进入”，优先看 `src/app`
- 想找“界面怎么拼出来”，优先看 `src/components`
- 想找“请求为什么这样处理”，优先看 `src/lib`
- 想找“页面状态从哪里来”，优先看 `src/store`
- 想找“这个类型定义在哪”，优先看 `src/types`
- 想找“数据库字段怎么定义”，优先看 `prisma/schema.prisma`
- 想找“本地检查怎么跑”，优先看 `scripts`
- 想找“对应功能的测试”，优先看 `__tests__`
