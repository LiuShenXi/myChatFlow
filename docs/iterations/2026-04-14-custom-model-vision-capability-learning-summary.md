# 2026-04-14 自定义模型视觉能力学习迭代总结

## 背景

本次迭代主要解决一个体验和正确性同时存在的问题：

- 文本型自定义模型在携带图片时会被错误放行到上游
- 视觉型自定义模型又不能因为不认识就被一刀切禁掉

在实际联调中，`glm-5.1` 纯文本可正常对话，但带图会返回明确失败；同时用户也需要继续保留 `GLM-5V-Turbo` 这类自定义视觉模型的可用性。

## 最终方案

系统为自定义模型引入三态视觉能力：

- `unknown`
- `vision`
- `text-only`

并为能力来源引入三态来源：

- `manual`
- `inferred`
- `learned`

最终落地规则如下：

- `vision`：允许图片请求
- `text-only`：前后端直接拦截图片请求
- `unknown`：默认允许先尝试图片请求，不在前端或后端预拦截
- 若 `unknown` 或 `vision` 模型在真实图片调用中命中高置信度“非视觉模型”错误，则自动学习为 `text-only`

## 本次落地内容

### 1. 数据模型与 API

- `CustomModelConfig` 新增：
  - `visionCapability`
  - `visionCapabilitySource`
- `/api/custom-models`
- `/api/custom-models/[id]`

这两组接口都已返回能力字段，并支持手动设置能力。

### 2. 能力解析与失败学习

新增文件：

- [src/lib/ai/custom-model-capabilities.ts](/Users/shenxi/Desktop/WORK-SPACE/myChatFlow/src/lib/ai/custom-model-capabilities.ts)

负责：

- provider hint 推断
- 已知模型静态能力推断
- 最终能力解析
- 非视觉错误分类

当前已内置 GLM 规则：

- `glm-5v-turbo`、`glm-4.6v` 推断为 `vision`
- `glm-5.1`、`glm-5`、`glm-4.7` 推断为 `text-only`

### 3. 聊天链路行为

关键入口：

- [src/app/(chat)/page.tsx](/Users/shenxi/Desktop/WORK-SPACE/myChatFlow/src/app/(chat)/page.tsx)
- [src/app/api/chat/route.ts](/Users/shenxi/Desktop/WORK-SPACE/myChatFlow/src/app/api/chat/route.ts)

最终行为：

- 前端不再阻止 `unknown` 自定义模型发图
- 前端只对 `text-only` 做本地拦截
- 后端只对 `text-only` 做预校验拒绝
- 后端在命中高置信度非视觉错误时，自动把能力写回为：
  - `visionCapability = text-only`
  - `visionCapabilitySource = learned`

### 4. 设置页能力管理

关键入口：

- [src/components/settings/CustomModelManager.tsx](/Users/shenxi/Desktop/WORK-SPACE/myChatFlow/src/components/settings/CustomModelManager.tsx)

现在设置页已经支持：

- 展示“图片能力”
- 展示“能力来源”
- 手动切换：
  - 自动识别中
  - 支持图片输入
  - 不支持图片输入

## 验证结果

本次迭代完成后已执行：

- `npx prisma db push`
- `npm test`
- `npm run build`

结果：

- `30` 个测试套件通过
- `157` 条测试通过
- `next build` 通过

## 相关文档

设计与计划文档：

- [docs/superpowers/specs/2026-04-14-custom-model-vision-capability-learning-design.md](/Users/shenxi/Desktop/WORK-SPACE/myChatFlow/docs/superpowers/specs/2026-04-14-custom-model-vision-capability-learning-design.md)
- [docs/superpowers/plans/2026-04-14-custom-model-vision-capability-learning.md](/Users/shenxi/Desktop/WORK-SPACE/myChatFlow/docs/superpowers/plans/2026-04-14-custom-model-vision-capability-learning.md)

本总结用于反映最终实际落地结果；若设计文档与实现细节有偏差，以本总结和代码为准。
