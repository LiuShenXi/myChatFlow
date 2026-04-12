# ChatFlow 豆包 Endpoint ID 接入设计

## 背景

当前 ChatFlow 已经支持 `豆包` 作为国产 provider，并且已经完成以下能力：

- 设置页可保存豆包 API Key
- 模型选择器可切换豆包模型
- 聊天链路可按 provider 读取 API Key 并调用 OpenAI-compatible provider

但当前豆包仍基于“公共模型 ID”方式接入，这和真实使用场景存在一个明显偏差：很多豆包接入方式实际依赖平台分配的 `endpoint-id`，而不是直接使用公共模型名。现状会带来两个问题：

1. 用户在设置页里只保存 API Key，但并没有地方配置豆包真正需要的 `endpoint-id`
2. 聊天链路看似已支持豆包，实际却可能因为缺少 `endpoint-id` 而无法按预期工作，容易形成“表面支持、真实不可用”的状态

这轮需求希望把豆包支持收敛为更真实、更明确的形式：

- 设置里同时配置 `API Key + endpoint-id`
- 聊天时豆包严格依赖 `endpoint-id`
- 如果没配置 `endpoint-id`，直接明确失败，不做静默回退

## 目标

1. 为豆包配置增加单个 `endpoint-id` 字段
2. 在设置页中让用户同时维护豆包 `API Key + endpoint-id`
3. 在聊天时让豆包模型优先使用数据库中的 `endpoint-id`
4. 当豆包缺少 `endpoint-id` 时，返回明确错误提示
5. 保持其他 provider 的数据结构、交互方式和聊天链路不受影响

## 非目标

- 不支持多个豆包 endpoint 管理
- 不新增独立的 provider settings 表
- 不将所有 provider 统一升级为通用高级配置系统
- 不对其他 provider 引入额外附加字段
- 不保留“豆包没配 endpoint-id 时回退公共模型 ID”的兼容模式

## 方案比较

### 方案 A：在现有 `ApiKey` 表上新增 `endpointId`

仅对现有 `ApiKey` 数据结构做最小扩展，让豆包复用同一条配置记录，新增一个可空 `endpointId` 字段。

优点：

- 改动最小
- 和当前“每个 provider 一条配置记录”的模型完全一致
- 设置页、路由层和聊天链路都容易对齐
- 测试范围清晰，可控性最好

缺点：

- 不具备抽象的通用 provider 扩展能力
- 未来如果别家 provider 也需要附加字段，还需要继续演进

### 方案 B：给 `ApiKey` 增加通用 `meta/config` JSON 字段

让豆包的 `endpoint-id` 先存入一个通用扩展字段，后续其他 provider 也可复用。

优点：

- 扩展性更强
- 理论上更适合未来附加配置增加

缺点：

- 这轮需求会被做得过于抽象
- 前后端类型、校验、测试都更复杂
- 当前只有豆包需要附加字段，不符合 YAGNI

### 方案 C：新增独立 provider settings 表

把 provider 的附加配置从 `ApiKey` 里拆出去，单独建表维护。

优点：

- 长期结构最规整
- 未来扩展多 endpoint、多 provider 高级配置时更灵活

缺点：

- 明显超出本期范围
- 需要新增表、关联、迁移、读取逻辑和更多测试
- 会把本次“小步真实可用”的需求做成重构型迭代

## 采用方案

采用方案 A：在 `ApiKey` 表上新增可空 `endpointId` 字段，豆包使用该字段，其他 provider 忽略该字段。

## 设计细节

### 1. 数据结构落点

在 `prisma/schema.prisma` 的 `ApiKey` 模型上新增：

- `endpointId String?`

约束策略：

- 字段本身允许为空，避免影响已有 provider 和历史数据
- 业务规则上仅当 `provider === "doubao"` 时要求该字段必须存在

这样做的目的有两个：

- 数据模型对其他 provider 保持兼容，不需要额外迁移逻辑
- 豆包的配置可以继续和 `encryptedKey` 保持在同一条 provider 记录中，避免 UI 和后端访问逻辑裂开

### 2. 设置页交互

设置页中仅在 `豆包` 卡片内新增一个额外输入项：`endpoint-id`。

交互规则如下：

- 首次未保存时：
  - 显示 `API Key` 输入框
  - 显示 `endpoint-id` 输入框
  - 只有两个字段都填写后才允许保存

- 已保存后：
  - 豆包卡片仍显示“已配置”
  - `endpoint-id` 可回填显示，允许用户继续修改
  - 用户更新时，保存的是完整的 `API Key + endpoint-id`

- 删除时：
  - 沿用当前按 provider 删除整条配置记录的逻辑
  - 删除豆包时，一并清掉该记录上的 `encryptedKey + endpointId`

界面层不引入“高级配置折叠区”或“豆包专属设置页”，避免本期把交互做重。

### 3. `/api/keys` 路由行为

#### `POST /api/keys`

当前接口已支持保存 provider 的 API Key。本期新增豆包专属校验：

- 当 `provider !== "doubao"` 时，维持现有行为不变
- 当 `provider === "doubao"` 时：
  - `apiKey` 必填
  - `endpointId` 必填
  - 若任一缺失，返回 `400`
  - 保存时将 `apiKey` 加密后写入 `encryptedKey`
  - 将 `endpointId` 以明文写入 `endpointId`

#### `GET /api/keys`

为了让设置页可回显豆包配置状态，接口应在豆包项中包含 `endpointId` 信息。

建议行为：

- 继续返回各 provider 的已配置列表
- 对豆包额外返回 `endpointId`

因为 `endpoint-id` 本身不是密钥，不需要像 `apiKey` 一样加密存储；同时让前端拿到当前值，也便于编辑体验保持一致。

#### `DELETE /api/keys`

保持按 provider 删除整条配置记录的行为不变。

### 4. 豆包聊天链路行为

当用户在模型选择器中选中豆包模型时，聊天链路不再使用静态公共模型 ID 直接调用。

行为调整如下：

1. 先按当前模型解析 provider
2. 如果 provider 不是 `doubao`，继续沿用现有逻辑
3. 如果 provider 是 `doubao`：
   - 从数据库读取该用户豆包配置记录
   - 读取并校验 `endpointId`
   - 若不存在，直接返回明确错误
   - 若存在，将实际调用 SDK 的模型标识替换为该 `endpointId`

这意味着：

- 豆包在 UI 上仍然可以保留“豆包 Seed 1.6”“豆包 Seed 1.6 Flash”这类模型展示名
- 但真正的请求落点由用户保存的 `endpointId` 决定

本期不做“一个豆包模型对应一个 endpoint”的复杂映射，也不做多 endpoint 切换；单账号下只维护一个豆包 endpoint。

### 5. 错误处理策略

本期采用严格失败，不做回退。

当用户选中豆包模型但缺少 `endpoint-id` 时：

- 设置保存阶段：阻止保存并返回明确校验错误
- 聊天调用阶段：返回明确错误，例如“请先在设置中配置豆包 endpoint-id”

不采用公共模型 ID 回退的原因：

- 会掩盖真实接入要求
- 容易造成“有时能用、有时不能用”的不透明状态
- 不利于真实联调排障

### 6. 对其他 provider 的影响控制

本期所有新增逻辑都应显式限制在 `provider === "doubao"` 的条件下。

也就是说：

- OpenAI、Anthropic、DeepSeek、Qwen、GLM、Kimi 的保存与删除逻辑不变
- 模型选择器的展示结构不变
- 非豆包聊天链路不读取 `endpointId`
- 非豆包测试不需要重写

## 测试策略

本期采用 TDD，建议至少补齐以下 4 类测试。

### 1. 路由层测试

`__tests__/app/api/keys/route.test.ts`

覆盖：

- 豆包保存时缺少 `endpointId` 返回 `400`
- 豆包保存完整 `apiKey + endpointId` 时写入成功
- `GET /api/keys` 会返回豆包的 `endpointId`

### 2. 设置页组件测试

`__tests__/components/settings/ApiKeyManager.test.tsx`

覆盖：

- 豆包卡片显示额外的 `endpoint-id` 输入框
- 豆包缺少 `endpoint-id` 时保存按钮不可用或保存失败
- 豆包填写完整信息后可正常保存

### 3. 聊天路由测试

`__tests__/app/api/chat/route.test.ts`

覆盖：

- 当 provider 为 `doubao` 且存在 `endpointId` 时，聊天链路实际使用 `endpointId`
- 当 provider 为 `doubao` 但缺少 `endpointId` 时，返回明确错误
- 非豆包 provider 仍沿用原逻辑

### 4. 数据模型与迁移验证

结合 Prisma 迁移或 `db push` 验证：

- `ApiKey` 新增字段后不会影响已有 provider 记录
- 新字段在数据库中可为空，兼容历史数据

## 影响范围

- `prisma/schema.prisma`
- `src/app/api/keys/route.ts`
- `src/app/api/chat/route.ts`
- `src/components/settings/ApiKeyManager.tsx`
- 相关测试文件

## 验收标准

完成后应满足：

1. 设置页豆包卡片可同时配置 `API Key + endpoint-id`
2. 豆包配置缺少 `endpoint-id` 时，不能进入有效聊天链路，并有明确错误提示
3. 豆包配置完整后，聊天链路实际使用数据库中的 `endpointId`
4. 其他 provider 行为不受影响
5. `npm run verify:local` 通过

## 后续演进

如果后续继续增强豆包支持，可独立拆出后续迭代：

- 多个豆包 endpoint 管理
- endpoint 与模型展示名的映射关系
- provider 通用高级配置区
- 通用 JSON 配置字段或独立 provider settings 表
