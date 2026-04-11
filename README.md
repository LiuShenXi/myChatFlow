个人项目

ChatFlow — 多模型 AI 对话平台 | 独立开发

技术栈: Next.js 15 (App Router), TypeScript, Vercel AI SDK, shadcn/ui, Tailwind CSS, Zustand, Prisma, PostgreSQL

做了什么:

- 基于 Vercel AI SDK（useChat + streamText）实现多模型流式对话，统一适配 OpenAI / Claude / DeepSeek，切换模型不改 UI 层代码
- 实现流式 Markdown 渲染器：逐 token 解析，支持代码块语法高亮（Shiki）、LaTeX 公式（KaTeX）、表格增量渲染
- 处理流式边界情况：网络中断重连、超时降级、部分响应保留、Token 用量实时计数
- 多模态输入：图片拖拽/粘贴上传，自动压缩后转 Base64 传给视觉模型
- Next.js Server Actions 实现安全的 API Key 处理，Prisma + PostgreSQL 存储会话，支持用户自带 Key（BYOK）加密存储