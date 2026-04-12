# ChatFlow Multimodal Closeout

## 背景

本次收尾对应分支：`chatflow-multimodal`

目标是把 ChatFlow 的图片多模态链路真正打通，并修复带图请求在真实会话历史下会触发的流式报错。

## 本次完成内容

### 1. 图片输入闭环

- 聊天页提交时会把本地图片转换为 AI SDK `experimental_attachments`
- 后端 `/api/chat` 会提取用户图片并持久化到数据库 `Message.images[]`
- 刷新页面或重新进入会话时，历史图片会重新映射回 UI message 并正常回显
- 用户消息区域新增图片缩略图展示

### 2. 模型能力判断

- 内置模型通过 `supportsVision` 显式声明是否支持图片输入
- 自定义模型默认按“支持图片输入”处理，避免在网关能力未知时过早拦截
- 当前模型不支持图片输入时，前端会阻止提交并给出明确提示
- 后端也保留能力校验，避免前端绕过

### 3. 消息归一化辅助层

- 新增 `src/lib/chat/message-parts.ts`
- 统一收口以下职责：
  - `buildImageAttachments`
  - `extractImageUrls`
  - `mapStoredMessageToUiMessage`
  - `sanitizeMessagesForModelInput`
- 这样聊天页、消息渲染层和 `/api/chat` 共用一套消息与图片处理规则

### 4. 线上表现问题修复

本次额外修复了一个真实请求下的图片报错：

- 现象：上传图片后 `/api/chat` 返回 `"An error occurred."`
- 根因：历史 assistant message 的 `parts` 中包含 `type: "step-start"`，`ai@4.3.16` 在转换模型输入时不支持这个 part
- 修复：在传给 `streamText` 前调用 `sanitizeMessagesForModelInput`，仅移除会导致转换失败的 `assistant.parts[].type === "step-start"`
- 保留了正常文本 part 和用户图片附件，不影响多模态输入本身

## 关键实现位置

- `src/lib/chat/message-parts.ts`
- `src/app/api/chat/route.ts`
- `src/app/(chat)/page.tsx`
- `src/components/chat/InputArea.tsx`
- `src/components/chat/MessageItem.tsx`
- `src/components/settings/ModelSelector.tsx`
- `src/types/model.ts`

## 测试覆盖

本次新增或补强了以下测试：

- `__tests__/lib/chat/message-parts.test.ts`
- `__tests__/app/api/chat/route.test.ts`
- `__tests__/app/chat-page.test.tsx`
- `__tests__/components/chat/InputArea.test.tsx`
- `__tests__/components/chat/MessageItem.test.tsx`
- `__tests__/components/settings/ModelSelector.test.tsx`

重点覆盖内容包括：

- 图片附件构造与提取
- 历史消息图片回显映射
- `step-start` 清洗逻辑
- 视觉模型 / 非视觉模型的图片提交行为
- 前端错误提示与消息渲染

## 验证证据

本次收尾前已完成：

- `npm test -- --runInBand`

结果：

- `29/29` 个测试套件通过
- `146/146` 个测试通过

## 人工回归建议

建议浏览器至少覆盖以下路径：

1. 选择支持视觉的模型，发送“文本 + 图片”
2. 选择不支持视觉的模型，确认前端阻止提交并提示切换模型
3. 发送带图消息后刷新页面，确认历史图片仍可回显
4. 选择自定义模型发送图片，确认链路不被前端或后端误拦截
5. 用包含历史 assistant steps 的旧会话再次发图，确认不再出现 `"An error occurred."`

## 推荐下一步

1. 将本分支提交并 push 到远端
2. 合并前做一次浏览器多模态冒烟验证
3. 合并后在主工作区重新跑一遍本地联调闭环
