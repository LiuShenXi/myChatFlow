# ChatFlow 架构设计文档

## 项目背景

ChatFlow 是一个多模型 AI 对话平台，作为个人练手项目开发。项目目标是实现一个功能完整、代码清晰的现代化 Web 应用，用于学习和展示 Next.js 15、Vercel AI SDK、流式渲染等前沿技术。

**核心需求：**
- 支持多个 AI 模型（OpenAI、Claude、DeepSeek）的统一对话界面
- 流式 Markdown 渲染，支持代码高亮和 LaTeX 公式
- 多模态输入（文本 + 图片）
- 会话管理（创建、删除、重命名）
- 用户自带 API Key（BYOK）加密存储
- 简洁居中的 UI 布局风格

**技术约束：**
- 部署平台：Vercel
- 数据库：Vercel Postgres
- 认证方式：NextAuth.js（Google/GitHub 第三方登录）
- 个人项目，优先开发速度和代码简洁性

## 架构方案

采用**简化扁平架构**，适合个人项目快速迭代，避免过度设计。

### 项目结构

```
myChatFlow/
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── (auth)/                   # 认证路由组
│   │   │   ├── login/
│   │   │   └── layout.tsx
│   │   ├── (chat)/                   # 对话路由组
│   │   │   ├── page.tsx              # 主对话页面
│   │   │   └── layout.tsx
│   │   ├── api/                      # API Routes
│   │   │   ├── auth/[...nextauth]/   # NextAuth.js
│   │   │   ├── chat/                 # 对话 API
│   │   │   └── sessions/             # 会话管理 API
│   │   ├── layout.tsx                # 根布局
│   │   └── globals.css
│   │
│   ├── components/                   # 所有 UI 组件
│   │   ├── chat/                     # 对话相关组件
│   │   │   ├── ChatContainer.tsx
│   │   │   ├── MessageList.tsx
│   │   │   ├── MessageItem.tsx
│   │   │   ├── InputArea.tsx
│   │   │   ├── ImageUpload.tsx
│   │   │   └── MarkdownRenderer.tsx
│   │   ├── session/                  # 会话管理组件
│   │   │   ├── SessionList.tsx
│   │   │   ├── SessionItem.tsx
│   │   │   └── SessionDrawer.tsx
│   │   ├── settings/                 # 设置相关组件
│   │   │   ├── ModelSelector.tsx
│   │   │   ├── ApiKeyManager.tsx
│   │   │   └── SettingsDialog.tsx
│   │   └── ui/                       # shadcn/ui 基础组件
│   │
│   ├── hooks/                        # 自定义 Hooks
│   │   ├── useChat.ts
│   │   ├── useSession.ts
│   │   ├── useImageUpload.ts
│   │   └── useStreamingMarkdown.ts
│   │
│   ├── lib/                          # 核心逻辑和工具
│   │   ├── ai/                       # AI 模型适配
│   │   │   ├── providers.ts
│   │   │   ├── stream-handler.ts
│   │   │   └── token-counter.ts
│   │   ├── db/                       # 数据库
│   │   │   └── prisma.ts
│   │   ├── auth/                     # 认证
│   │   │   ├── next-auth.ts
│   │   │   └── encryption.ts
│   │   └── utils/                    # 工具函数
│   │       ├── markdown.ts
│   │       ├── image.ts
│   │       └── format.ts
│   │
│   ├── store/                        # Zustand 状态管理
│   │   ├── chat-store.ts
│   │   ├── session-store.ts
│   │   └── settings-store.ts
│   │
│   └── types/                        # TypeScript 类型定义
│       ├── chat.ts
│       ├── session.ts
│       └── model.ts
│
├── prisma/
│   └── schema.prisma
│
├── public/
├── .env.local
├── next.config.js
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

**设计原则：**
- 按功能分类但保持扁平，避免过深嵌套
- 组件、hooks、lib 各司其职，职责清晰
- 文件查找方便，适合个人快速开发

## 数据库设计

使用 Prisma + PostgreSQL，模型设计如下：

### 核心模型

**User（用户）**
- 存储用户基本信息
- 关联 NextAuth.js 的 Account 和 Session
- 一对多关联 ChatSession 和 ApiKey

**ChatSession（对话会话）**
- 存储对话会话元数据（标题、模型、时间）
- 一对多关联 Message
- 按 userId + updatedAt 索引，优化会话列表查询

**Message（消息）**
- 存储对话消息内容
- 支持 role（user/assistant/system）
- images 字段存储图片 Base64 数组（练手项目简化方案，生产环境建议改用对象存储）
- tokenCount 记录 Token 消耗
- 按 sessionId + createdAt 索引，优化消息列表查询

**ApiKey（API 密钥）**
- 加密存储用户的 API Key
- 按 provider 区分（openai/claude/deepseek）
- userId + provider 唯一索引

### Schema 定义

```prisma
model User {
  id            String    @id @default(cuid())
  email         String    @unique
  name          String?
  image         String?
  emailVerified DateTime?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  
  accounts      Account[]
  sessions      Session[]
  chatSessions  ChatSession[]
  apiKeys       ApiKey[]
}

model ChatSession {
  id        String   @id @default(cuid())
  userId    String
  title     String   @default("新对话")
  model     String   @default("gpt-4")
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  user      User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  messages  Message[]
  
  @@index([userId, updatedAt])
}

model Message {
  id            String      @id @default(cuid())
  sessionId     String
  role          String
  content       String      @db.Text
  images        String[]
  tokenCount    Int?
  createdAt     DateTime    @default(now())
  
  session       ChatSession @relation(fields: [sessionId], references: [id], onDelete: Cascade)
  
  @@index([sessionId, createdAt])
}

model ApiKey {
  id          String   @id @default(cuid())
  userId      String
  provider    String
  encryptedKey String  @db.Text
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@unique([userId, provider])
}
```

## 核心功能实现

### 1. AI 模型适配层

使用 Vercel AI SDK 统一适配多个模型提供商：

```typescript
// src/lib/ai/providers.ts
import { openai } from '@ai-sdk/openai'
import { anthropic } from '@ai-sdk/anthropic'
import { createOpenAI } from '@ai-sdk/openai'

export const providers = {
  openai: (apiKey: string) => openai.chat('gpt-4', { apiKey }),
  claude: (apiKey: string) => anthropic('claude-3-5-sonnet-20241022', { apiKey }),
  deepseek: (apiKey: string) => {
    const deepseek = createOpenAI({
      baseURL: 'https://api.deepseek.com/v1',
      apiKey,
    })
    return deepseek.chat('deepseek-chat')
  },
}
```

**关键点：**
- 统一接口，切换模型不改 UI 层代码
- 支持自定义 baseURL（DeepSeek）
- API Key 动态注入，支持 BYOK

### 2. 流式对话实现

```typescript
// src/app/api/chat/route.ts
import { streamText } from 'ai'
import { providers } from '@/lib/ai/providers'
import { getApiKey } from '@/lib/auth/encryption'

export async function POST(req: Request) {
  const { messages, model, sessionId } = await req.json()
  const userId = await getCurrentUserId()
  
  const apiKey = await getApiKey(userId, model)
  
  const result = await streamText({
    model: providers[model](apiKey),
    messages,
    onFinish: async ({ text, usage }) => {
      await saveMessage(sessionId, 'assistant', text, usage.totalTokens)
    },
  })
  
  return result.toDataStreamResponse()
}
```

**关键点：**
- 使用 Vercel AI SDK 的 streamText 实现流式响应
- onFinish 回调保存消息到数据库
- 返回 DataStreamResponse 供前端消费

### 3. 流式 Markdown 渲染

```typescript
// src/components/chat/MarkdownRenderer.tsx
import ReactMarkdown from 'react-markdown'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'

export function MarkdownRenderer({ content }: { content: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkMath]}
      rehypePlugins={[rehypeKatex]}
      components={{
        code({ node, inline, className, children, ...props }) {
          const match = /language-(\w+)/.exec(className || '')
          return !inline && match ? (
            <SyntaxHighlighter language={match[1]} {...props}>
              {String(children).replace(/\n$/, '')}
            </SyntaxHighlighter>
          ) : (
            <code className={className} {...props}>
              {children}
            </code>
          )
        },
      }}
    >
      {content}
    </ReactMarkdown>
  )
}
```

**关键点：**
- 支持代码块语法高亮（Shiki/Prism）
- 支持 LaTeX 公式渲染（KaTeX）
- 逐 token 增量渲染，实时显示

### 4. 图片上传处理

```typescript
// src/hooks/useImageUpload.ts
export function useImageUpload() {
  const compressAndConvert = async (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        const img = new Image()
        img.onload = () => {
          const canvas = document.createElement('canvas')
          const ctx = canvas.getContext('2d')!
          
          // 压缩到最大 1024px
          const maxSize = 1024
          let { width, height } = img
          if (width > height && width > maxSize) {
            height = (height * maxSize) / width
            width = maxSize
          } else if (height > maxSize) {
            width = (width * maxSize) / height
            height = maxSize
          }
          
          canvas.width = width
          canvas.height = height
          ctx.drawImage(img, 0, 0, width, height)
          
          resolve(canvas.toDataURL('image/jpeg', 0.8))
        }
        img.src = e.target?.result as string
      }
      reader.readAsDataURL(file)
    })
  }
  
  return { compressAndConvert }
}
```

**关键点：**
- 自动压缩图片到 1024px
- 转换为 Base64 格式
- 支持拖拽、粘贴、点击上传三种方式

### 5. 状态管理

使用 Zustand 进行轻量级状态管理，分为三个独立 store：

**chat-store.ts**
- 管理当前输入、上传图片、流式状态
- 部分状态持久化到 localStorage

**session-store.ts**
- 管理会话列表、当前会话、模型选择
- 封装会话 CRUD 操作

**settings-store.ts**
- 管理主题、UI 偏好
- 全部持久化到 localStorage
- 注意：API Key 不缓存在前端，仅通过 Server Action 存取数据库

**设计原则：**
- 按功能模块拆分，避免单一巨大 store
- API 调用封装在 store 内部
- 临时数据不持久化，避免 localStorage 过大

## UI 设计

### 布局风格

采用**简洁居中布局**，类似 Claude.ai：

```
┌─────────────────────────────────────────┐
│  [☰] ChatFlow    [模型选择] [设置]      │  ← Header
├─────────────────────────────────────────┤
│                                         │
│         ┌─────────────────┐             │
│         │                 │             │
│         │   消息列表区     │             │  ← 最大宽度 768px
│         │   (居中显示)     │             │
│         │                 │             │
│         └─────────────────┘             │
│         ┌─────────────────┐             │
│         │  [📎] 输入框 [→] │             │  ← 输入区
│         └─────────────────┘             │
│                                         │
└─────────────────────────────────────────┘

[会话列表抽屉] ← 点击 ☰ 从左侧滑出
```

**关键特性：**
- 主内容区居中，最大宽度 3xl（768px）
- 会话列表使用 Sheet 抽屉，默认隐藏
- 顶部工具栏固定，包含模型选择和设置
- 输入框支持自动高度调整（最大 128px）

### 核心组件

**MessageList（消息列表）**
- 自动滚动到底部
- 空状态提示
- 加载指示器

**InputArea（输入区域）**
- 多行文本输入，自动调整高度
- 图片预览和删除
- 支持拖拽、粘贴、点击上传
- 发送按钮状态管理

**SessionDrawer（会话抽屉）**
- 会话列表展示
- 新建对话按钮
- 会话项点击切换
- 删除和重命名操作

**MarkdownRenderer（Markdown 渲染器）**
- 代码块语法高亮
- LaTeX 公式渲染
- 表格、列表等完整支持

## 安全设计

### API Key 加密存储

使用 AES-256-GCM 加密算法：

```typescript
// src/lib/auth/encryption.ts
import crypto from 'crypto'

const ALGORITHM = 'aes-256-gcm'

export function encrypt(text: string): string {
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY, 'hex'), iv)
  
  let encrypted = cipher.update(text, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  
  const authTag = cipher.getAuthTag()
  
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`
}

export function decrypt(encryptedData: string): string {
  const [ivHex, authTagHex, encrypted] = encryptedData.split(':')
  
  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    Buffer.from(ENCRYPTION_KEY, 'hex'),
    Buffer.from(ivHex, 'hex')
  )
  
  decipher.setAuthTag(Buffer.from(authTagHex, 'hex'))
  
  let decrypted = decipher.update(encrypted, 'hex', 'utf8')
  decrypted += decipher.final('utf8')
  
  return decrypted
}
```

**安全措施：**
- 使用 AES-256-GCM 认证加密
- 每次加密生成随机 IV
- 加密密钥存储在环境变量中
- 数据库只存储密文

### 认证与授权

使用 Next.js 中间件保护 API 路由：

```typescript
// src/middleware.ts
import { withAuth } from 'next-auth/middleware'

export default withAuth({
  callbacks: {
    authorized: ({ token, req }) => {
      if (req.nextUrl.pathname.startsWith('/api/chat')) {
        return !!token
      }
      return true
    },
  },
})

export const config = {
  matcher: ['/api/chat/:path*', '/api/sessions/:path*'],
}
```

**安全要点：**
- 所有对话和会话 API 需要认证
- 用户只能访问自己的数据
- API Key 仅在服务端解密，不传递到客户端

## 性能优化

### 1. 消息分页加载

```typescript
export async function getMessages(sessionId: string, page = 1, limit = 50) {
  return await prisma.message.findMany({
    where: { sessionId },
    orderBy: { createdAt: 'desc' },
    skip: (page - 1) * limit,
    take: limit,
  })
}
```

### 2. 图片懒加载

```typescript
<img src={src} alt={alt} loading="lazy" decoding="async" />
```

### 3. 数据库索引

- ChatSession: `@@index([userId, updatedAt])`
- Message: `@@index([sessionId, createdAt])`

### 4. Next.js 配置优化

```javascript
// next.config.js
module.exports = {
  reactStrictMode: true,
  compress: true,
  images: {
    formats: ['image/avif', 'image/webp'],
  },
}
```

## 环境配置

### 环境变量

```bash
# .env.local

# 数据库
POSTGRES_PRISMA_URL="postgres://..."
POSTGRES_URL_NON_POOLING="postgres://..."

# NextAuth.js
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="生成的随机密钥"

# OAuth 提供商
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
GITHUB_CLIENT_ID="your-github-client-id"
GITHUB_CLIENT_SECRET="your-github-client-secret"

# API Key 加密密钥
ENCRYPTION_KEY="64位十六进制字符串"
```

### 依赖包

**核心依赖：**
- next@^15.0.0
- react@^19.0.0
- typescript@^5.3.0
- ai@^3.0.0（Vercel AI SDK）
- @ai-sdk/openai@^0.0.20
- @ai-sdk/anthropic@^0.0.20
- next-auth@^5.0.0-beta
- @prisma/client@^5.8.0
- zustand@^4.4.7

**UI 依赖：**
- react-markdown@^9.0.1
- remark-math@^6.0.0
- rehype-katex@^7.0.0
- react-syntax-highlighter@^15.5.0
- shadcn/ui（Radix UI 组件）
- tailwindcss@^3.4.0

## 开发流程

### 本地开发

```bash
# 1. 安装依赖
npm install

# 2. 配置环境变量
cp .env.example .env.local
# 编辑 .env.local 填入实际值

# 3. 初始化数据库
npx prisma generate
npx prisma db push

# 4. 启动开发服务器
npm run dev
```

### Vercel 部署

**步骤：**

1. **连接 GitHub 仓库**
   - 在 Vercel 控制台导入项目
   - 选择 myChatFlow 仓库

2. **配置环境变量**
   - 在 Vercel 项目设置中添加所有环境变量
   - NEXTAUTH_URL 改为生产域名

3. **配置 Vercel Postgres**
   - 在 Storage 标签创建 Postgres 数据库
   - 自动注入数据库连接变量

4. **部署**
   - 推送代码到 main 分支自动触发部署
   - 首次部署后运行 `npx prisma db push`

5. **配置 OAuth 回调**
   - Google Console: 添加回调 URL
   - GitHub Settings: 添加回调 URL

## 验证方案

### 功能验证

**对话功能：**
1. 登录后创建新对话
2. 选择不同模型（OpenAI/Claude/DeepSeek）
3. 发送文本消息，验证流式响应
4. 上传图片，验证多模态输入
5. 检查 Markdown 渲染（代码高亮、LaTeX）
6. 验证 Token 计数显示

**会话管理：**
1. 创建多个会话
2. 切换会话，验证消息正确加载
3. 重命名会话
4. 删除会话

**API Key 管理：**
1. 在设置中添加 API Key
2. 验证加密存储到数据库
3. 切换模型，验证使用对应 Key
4. 删除 Key，验证无法调用对应模型

### 性能验证

1. 检查首屏加载时间（< 2s）
2. 验证流式响应延迟（< 500ms）
3. 测试大量消息的滚动性能
4. 验证图片压缩效果（< 200KB）

### 安全验证

1. 验证未登录用户无法访问对话 API
2. 验证用户只能访问自己的会话
3. 检查数据库中 API Key 为密文
4. 验证客户端无法获取原始 API Key

## 总结

本设计采用简化扁平架构，适合个人项目快速开发。核心技术栈为 Next.js 15 + Vercel AI SDK + Prisma + Zustand，实现了多模型对话、流式渲染、会话管理等完整功能。

**优势：**
- 结构简单清晰，易于理解和维护
- 充分利用 Vercel 生态，部署便捷
- 安全性设计完善（加密存储、认证保护）
- 性能优化到位（分页、懒加载、索引）

**适用场景：**
- 个人学习和练手项目
- 技术栈展示和演示
- 快速原型开发
