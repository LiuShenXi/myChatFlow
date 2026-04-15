# ChatFlow 核心项目文档包设计

## 背景

当前仓库已经具备一批有价值的项目文档，但这些文档的定位还不够清晰，主要存在三个问题：

- `README.md` 同时承担项目介绍、启动指南、能力说明和文档索引，信息密度较高，但缺少“项目总入口”的稳定结构
- `docs/project-architecture.md` 已经覆盖了大量架构信息，但缺少与“项目总览”“目录结构”“开发手册”“功能地图”之间的边界分工
- `docs/hand-off.md`、`docs/local-qa-checklist.md`、`docs/superpowers/*` 分别服务于交接、联调、过程管理，但目前还没有一层更稳定的“项目主文档”来统一承接长期认知

这导致两个典型问题：

1. 新接手项目的人很难快速判断“应该先看哪份文档”
2. 项目已经具备的能力、代码结构和开发路径没有被整理成一套长期可维护的文档体系

因此，这次工作的目标不是一次性补齐所有项目文档，而是先产出一套首批核心文档包，让 ChatFlow 具备清晰、稳定、可扩展的项目文档基础层。

## 目标

本次文档工作需要满足以下目标：

- 让第一次进入仓库的人可以在短时间内理解项目定位、当前能力、核心架构和开发入口
- 让继续开发的人可以快速找到对应代码目录、关键模块和本地启动/验证方式
- 为后续补充接口文档、数据文档、部署文档、排障文档提供稳定的主文档骨架
- 保留现有交接文档与 superpowers 过程文档，但明确它们不属于项目主说明层

## 非目标

本次不追求一次性补齐以下内容：

- 逐个 API 的详细接口字段文档
- Prisma 数据表逐字段说明文档
- 完整的部署运维手册
- 全量故障排查手册
- ADR 决策记录体系

这些内容后续可以作为第二阶段文档补充，但不纳入这次首批核心文档交付范围。

## 现状判断

结合当前仓库，项目已经有以下文档资产：

- `README.md`
- `docs/project-architecture.md`
- `docs/hand-off.md`
- `docs/local-qa-checklist.md`
- `docs/superpowers/specs/*`
- `docs/superpowers/plans/*`
- `docs/iterations/*`

其中：

- `README.md` 适合保留为项目总入口，但应减少承担过多细节的压力
- `docs/project-architecture.md` 适合保留为系统架构主文档
- `docs/hand-off.md` 应明确为阶段性交接文档，而非长期主文档
- `docs/local-qa-checklist.md` 适合作为验证附录文档继续存在
- `docs/superpowers/*` 与 `docs/iterations/*` 属于过程文档层，不并入项目主说明层

## 推荐方案

采用“核心文档包”方案，也就是优先补齐最有价值的一组主文档，并对现有文档做边界重整，而不是在这一轮把所有文档类型一次性铺开。

这个方案的优势：

- 信息架构更稳定，用户可以快速知道该看哪份文档
- 文档量控制在合理范围内，不会把精力耗在当前仍可能变化的细枝末节上
- 能直接支撑当前仓库最常见的三类场景：读项目、跑项目、继续开发

## 交付物设计

本次文档交付分为“主文档”和“保留文档”两层。

### 一、主文档

#### 1. `README.md`

定位：项目总入口。

承担职责：

- 一句话介绍项目
- 当前能力与状态概览
- 快速启动入口
- 关键文档索引
- 后续阅读路径建议

不承担职责：

- 不再堆叠过多架构细节
- 不再承担完整开发手册职责

#### 2. `docs/project-overview.md`

定位：项目总览文档。

承担职责：

- 项目目标与定位
- 核心使用场景
- 当前已支持能力与边界
- 关键角色视角下的项目价值
- 建议阅读顺序

这份文档回答的问题是：“这个项目是什么，它现在做到什么程度，值不值得继续投入理解。”

#### 3. `docs/project-architecture.md`

定位：系统架构主文档。

承担职责：

- 技术栈与职责分工
- 目录与模块边界
- 核心请求链路
- 认证、模型路由、消息流式返回、数据持久化机制
- 关键扩展点

这份文档保留现有基础内容，但需要顺着当前真实代码再做收敛和补强，避免与其他主文档重复。

#### 4. `docs/project-structure.md`

定位：代码目录结构说明。

承担职责：

- 仓库目录树概览
- `src/app`、`src/components`、`src/lib`、`src/store`、`src/types`、`prisma`、`scripts` 的职责说明
- 关键入口文件与常见定位路径

这份文档重点解决“我应该去哪里找代码”的问题。

#### 5. `docs/development-guide.md`

定位：开发与联调手册。

承担职责：

- 本地准备步骤
- 环境变量说明与依赖关系
- 数据库初始化流程
- 常用命令说明
- 推荐联调顺序
- 与 `docs/local-qa-checklist.md` 的衔接关系

这份文档会吸收 `docs/hand-off.md` 中长期有效的开发信息，但不复制阶段性的交接描述。

#### 6. `docs/feature-map.md`

定位：当前功能地图。

承担职责：

- 认证能力
- 会话能力
- 聊天能力
- Provider / 模型配置能力
- 自定义模型能力
- 多模态能力边界
- 当前限制与暂未覆盖项

这份文档重点回答“项目现在具体能做什么，不能做什么”。

### 二、保留文档

以下文档继续保留，但在主文档体系中明确其定位：

- `docs/hand-off.md`
  - 阶段性交接文档
- `docs/local-qa-checklist.md`
  - 浏览器联调清单
- `docs/superpowers/specs/*`
  - 设计过程文档
- `docs/superpowers/plans/*`
  - 执行计划文档
- `docs/iterations/*`
  - 迭代总结文档

## 内容边界与去重策略

为了避免文档再次堆叠成“每篇都写一点同样的内容”，本次设计要求各文档边界明确：

- `README.md` 只做入口，不做深度展开
- `project-overview` 讲产品与能力概览，不讲实现细节
- `project-architecture` 讲系统实现与模块协作，不讲逐步启动教程
- `project-structure` 讲目录与文件定位，不复述完整架构链路
- `development-guide` 讲开发环境、命令、联调，不承担产品介绍
- `feature-map` 讲功能面和能力边界，不承担实现细节

当某一信息会在多篇文档被提及时，采用“主文档展开、其他文档引用”的方式处理，而不是重复粘贴。

## 文档组织方式

建议本轮完成后，`docs/` 顶层形成如下结构：

```text
docs/
  development-guide.md
  feature-map.md
  hand-off.md
  local-qa-checklist.md
  project-architecture.md
  project-overview.md
  project-structure.md
  iterations/
  superpowers/
```

其中：

- `project-*` 形成项目主认知层
- `development-guide.md` 与 `local-qa-checklist.md` 形成开发/验证层
- `hand-off.md` 作为阶段性交接层
- `superpowers/` 与 `iterations/` 作为过程沉淀层

## 执行策略

本次实现按以下顺序推进：

1. 先改造 `README.md`，把它收敛为总入口和导航页
2. 新增 `project-overview.md`
3. 梳理并更新 `project-architecture.md`
4. 新增 `project-structure.md`
5. 新增 `development-guide.md`
6. 新增 `feature-map.md`
7. 检查 `hand-off.md` 是否需要补充“文档定位说明”
8. 检查主文档之间的链接关系，保证导航闭环

## 风险与约束

本次文档整理需要注意以下风险：

- 现有文档中部分描述可能已经落后于当前代码，需要以仓库真实实现为准
- `docs/hand-off.md` 含有阶段性事实和上下文，迁移内容时必须区分“长期有效信息”和“临时交接信息”
- `README.md` 当前已经承载大量信息，调整时要避免把真正重要的启动指引误删

对应策略：

- 文档内容以代码、脚本、当前目录结构为准
- 交接类信息仅提炼长期有效部分进入主文档
- 所有新增文档都以“帮助第一次进入项目的人理解和行动”为导向

## 验收标准

当以下条件满足时，可认为本次首批核心文档包完成：

- 仓库新增 `project-overview.md`、`project-structure.md`、`development-guide.md`、`feature-map.md`
- `README.md` 已被收敛为项目入口页，并提供清晰跳转
- `docs/project-architecture.md` 已与当前代码实现保持一致
- 主文档之间存在稳定的阅读路径和互相引用
- 现有交接/流程文档仍保留，但定位已与主文档层区分清楚
- 阅读者无需先翻 superpowers 文档，也能完成“理解项目 + 本地启动 + 找到代码入口”这三个基础目标

## 后续扩展建议

在本轮完成后，可以按优先级继续补充第二阶段文档：

1. 接口文档
2. 数据模型文档
3. 部署发布文档
4. 排障手册
5. 测试说明

但这些不应阻塞本次核心文档包的交付。
