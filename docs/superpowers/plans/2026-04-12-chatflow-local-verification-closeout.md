# ChatFlow 本地联调收口包 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 补齐 ChatFlow 的本地联调收口包，让开发者能用统一命令完成环境自检与本地验证，并按文档完成真实环境联调。

**Architecture:** 采用“脚本 + npm scripts + 文档”三层收口。脚本独立于业务逻辑，负责环境自检与串行验证；`package.json` 暴露统一入口；`README.md` 与 `docs/*` 负责把启动顺序、排查路径和浏览器验收清单固化下来。

**Tech Stack:** Node.js, npm scripts, Jest, Next.js 15, TypeScript, Prisma, NextAuth

---

## File Structure

- Create: `docs/superpowers/plans/2026-04-12-chatflow-local-verification-closeout.md`
- Create: `__tests__/scripts/doctor.test.js`
- Create: `__tests__/scripts/verify-local.test.js`
- Create: `scripts/doctor.cjs`
- Create: `scripts/verify-local.cjs`
- Create: `docs/hand-off.md`
- Create: `docs/local-qa-checklist.md`
- Modify: `package.json`
- Modify: `README.md`
- Modify: `计划.md`

### Task 1: 环境自检脚本

**Files:**
- Create: `__tests__/scripts/doctor.test.js`
- Create: `scripts/doctor.cjs`

- [x] **Step 1: 写环境自检失败测试**

```js
expect(result.summary.canStart).toBe(false)
expect(result.summary.canRunRealIntegration).toBe(false)
expect(result.blockers.startupMissing).toContain("POSTGRES_PRISMA_URL")
```

- [x] **Step 2: 运行测试确认失败**

Run: `npm test -- __tests__/scripts/doctor.test.js --runInBand`
Expected: FAIL with module-not-found or missing exported function

- [x] **Step 3: 实现自检脚本与可复用函数**

```js
module.exports = {
  loadEnvFile,
  analyzeEnv,
  formatDoctorReport,
  runDoctor
}
```

- [x] **Step 4: 重新运行测试确认通过**

Run: `npm test -- __tests__/scripts/doctor.test.js --runInBand`
Expected: PASS

### Task 2: 串行本地验证脚本

**Files:**
- Create: `__tests__/scripts/verify-local.test.js`
- Create: `scripts/verify-local.cjs`
- Modify: `package.json`

- [x] **Step 1: 写串行验证失败测试**

```js
expect(summary[0].command).toBe("npx tsc --noEmit")
expect(summary[1].status).toBe("skipped")
```

- [x] **Step 2: 运行测试确认失败**

Run: `npm test -- __tests__/scripts/verify-local.test.js --runInBand`
Expected: FAIL with module-not-found or missing exported function

- [x] **Step 3: 实现串行执行器并接入 npm scripts**

```json
{
  "scripts": {
    "doctor": "node scripts/doctor.cjs",
    "verify:local": "node scripts/verify-local.cjs"
  }
}
```

- [x] **Step 4: 重新运行测试确认通过**

Run: `npm test -- __tests__/scripts/verify-local.test.js --runInBand`
Expected: PASS

### Task 3: 联调文档与交接落地

**Files:**
- Create: `docs/hand-off.md`
- Create: `docs/local-qa-checklist.md`
- Modify: `README.md`
- Modify: `计划.md`

- [x] **Step 1: 写联调交接文档**

```md
## 当前项目状态
## 开始前检查
## 环境变量准备
## 数据库准备
## OAuth 准备
## 启动项目
## 浏览器联调路径
## 常见问题排查
```

- [x] **Step 2: 写浏览器联调清单**

```md
- [ ] Google 登录正常
- [ ] GitHub 登录正常
- [ ] 保存 OpenAI Key
- [ ] 模型切换后发消息
```

- [x] **Step 3: 更新 README 与 `计划.md` 的入口索引**

```md
- `npm run doctor`
- `npm run verify:local`
- `docs/hand-off.md`
- `docs/local-qa-checklist.md`
```

### Task 4: 最终验证

**Files:**
- Verify only

- [x] **Step 1: 运行脚本测试**

Run: `npm test -- __tests__/scripts/doctor.test.js __tests__/scripts/verify-local.test.js --runInBand`
Expected: PASS

- [x] **Step 2: 运行完整仓库验证**

Run: `npm run verify:local`
Expected: 依次通过 TypeScript、Jest、ESLint、Next build

- [x] **Step 3: 运行环境自检命令**

Run: `npm run doctor`
Expected: 在缺少真实环境变量时给出清晰缺失项、启动阻塞项、联调阻塞项和下一步建议
