const fs = require("node:fs")
const path = require("node:path")

const REQUIREMENTS = [
  {
    key: "POSTGRES_PRISMA_URL",
    level: "startup",
    description: "Prisma 连接池数据库地址",
    validate: isPostgresUrl,
    invalidMessage: "需要是 postgres:// 或 postgresql:// URL"
  },
  {
    key: "POSTGRES_URL_NON_POOLING",
    level: "startup",
    description: "Prisma directUrl 数据库地址",
    validate: isPostgresUrl,
    invalidMessage: "需要是 postgres:// 或 postgresql:// URL"
  },
  {
    key: "NEXTAUTH_URL",
    level: "startup",
    description: "NextAuth 回调基础地址",
    validate: isHttpUrl,
    invalidMessage: "需要是 http:// 或 https:// URL"
  },
  {
    key: "NEXTAUTH_SECRET",
    level: "startup",
    description: "NextAuth 会话密钥"
  },
  {
    key: "ENCRYPTION_KEY",
    level: "startup",
    description: "BYOK 加密密钥",
    validate: isHex32ByteKey,
    invalidMessage: "需要是 64 位十六进制字符串"
  },
  {
    key: "GOOGLE_CLIENT_ID",
    level: "integration",
    description: "Google OAuth Client ID"
  },
  {
    key: "GOOGLE_CLIENT_SECRET",
    level: "integration",
    description: "Google OAuth Client Secret"
  },
  {
    key: "GITHUB_CLIENT_ID",
    level: "integration",
    description: "GitHub OAuth Client ID"
  },
  {
    key: "GITHUB_CLIENT_SECRET",
    level: "integration",
    description: "GitHub OAuth Client Secret"
  }
]

function stripWrappingQuotes(value) {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1)
  }

  return value
}

function normalizeValue(value) {
  if (value === undefined || value === null) {
    return undefined
  }

  const normalized = String(value).trim()

  if (!normalized) {
    return undefined
  }

  return stripWrappingQuotes(normalized)
}

function isPostgresUrl(value) {
  try {
    const parsed = new URL(value)
    return parsed.protocol === "postgres:" || parsed.protocol === "postgresql:"
  } catch {
    return false
  }
}

function isHttpUrl(value) {
  try {
    const parsed = new URL(value)
    return parsed.protocol === "http:" || parsed.protocol === "https:"
  } catch {
    return false
  }
}

function isHex32ByteKey(value) {
  return /^[a-f0-9]{64}$/i.test(value)
}

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return {}
  }

  const entries = {}
  const content = fs.readFileSync(filePath, "utf8")

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim()

    if (!line || line.startsWith("#")) {
      continue
    }

    const separatorIndex = line.indexOf("=")
    if (separatorIndex === -1) {
      continue
    }

    const key = line.slice(0, separatorIndex).trim()
    const value = line.slice(separatorIndex + 1).trim()

    if (!key) {
      continue
    }

    entries[key] = stripWrappingQuotes(value)
  }

  return entries
}

function resolveEnvSources(cwd = process.cwd()) {
  const candidates = [".env.local", ".env"]

  return candidates
    .map((fileName) => path.join(cwd, fileName))
    .filter((filePath) => fs.existsSync(filePath))
}

function loadAvailableEnv(cwd = process.cwd()) {
  const sourceFiles = resolveEnvSources(cwd)
  const env = {}

  for (const filePath of sourceFiles.reverse()) {
    Object.assign(env, loadEnvFile(filePath))
  }

  for (const requirement of REQUIREMENTS) {
    if (process.env[requirement.key] !== undefined) {
      env[requirement.key] = process.env[requirement.key]
    }
  }

  return {
    env,
    sourceFiles
  }
}

function analyzeEnv(rawEnv) {
  const checks = REQUIREMENTS.map((requirement) => {
    const value = normalizeValue(rawEnv[requirement.key])

    if (!value) {
      return {
        ...requirement,
        status: "missing"
      }
    }

    if (requirement.validate && !requirement.validate(value)) {
      return {
        ...requirement,
        status: "invalid"
      }
    }

    return {
      ...requirement,
      status: "ok"
    }
  })

  const blockers = {
    startupMissing: collectKeys(checks, "startup", "missing"),
    startupInvalid: collectKeys(checks, "startup", "invalid"),
    integrationMissing: collectKeys(checks, "integration", "missing"),
    integrationInvalid: collectKeys(checks, "integration", "invalid")
  }

  const summary = {
    canStart:
      blockers.startupMissing.length === 0 && blockers.startupInvalid.length === 0,
    canRunRealIntegration:
      blockers.startupMissing.length === 0 &&
      blockers.startupInvalid.length === 0 &&
      blockers.integrationMissing.length === 0 &&
      blockers.integrationInvalid.length === 0
  }

  return {
    checks,
    blockers,
    summary,
    suggestions: buildSuggestions(summary)
  }
}

function collectKeys(checks, level, status) {
  return checks
    .filter((item) => item.level === level && item.status === status)
    .map((item) => item.key)
}

function buildSuggestions(summary) {
  if (!summary.canStart) {
    return [
      "补齐启动阻塞项后重新运行 npm run doctor",
      "启动条件齐备后运行 npm run verify:local"
    ]
  }

  if (!summary.canRunRealIntegration) {
    return [
      "补齐真实联调阻塞项后重新运行 npm run doctor",
      "环境具备后运行 npm run verify:local，并参考 docs/local-qa-checklist.md 逐项联调"
    ]
  }

  return [
    "运行 npm run verify:local",
    "确认数据库与 OAuth 配置可用后，按照 docs/local-qa-checklist.md 逐项联调"
  ]
}

function formatDoctorReport(result, options = {}) {
  const { sourceFiles = [] } = options
  const lines = [
    "ChatFlow Local Doctor",
    "=====================",
    `已检测环境文件: ${sourceFiles.length > 0 ? sourceFiles.join(", ") : "未发现，仅读取当前 shell 环境"}`,
    `可启动: ${result.summary.canStart ? "是" : "否"}`,
    `可进行真实联调: ${result.summary.canRunRealIntegration ? "是" : "否"}`,
    ""
  ]

  appendSection(lines, "启动阻塞项", [
    ...result.blockers.startupMissing.map((key) => `${key}（缺失）`),
    ...result.blockers.startupInvalid.map((key) => `${key}（格式无效）`)
  ])

  appendSection(lines, "真实联调阻塞项", [
    ...result.blockers.integrationMissing.map((key) => `${key}（缺失）`),
    ...result.blockers.integrationInvalid.map((key) => `${key}（格式无效）`)
  ])

  appendSection(
    lines,
    "检查明细",
    result.checks.map((item) => {
      const suffix =
        item.status === "invalid" && item.invalidMessage
          ? ` - ${item.invalidMessage}`
          : ""

      return `${item.key}: ${translateStatus(item.status)}（${item.description}）${suffix}`
    })
  )

  appendSection(lines, "下一步建议", result.suggestions)

  return lines.join("\n")
}

function appendSection(lines, title, items) {
  lines.push(`${title}:`)

  if (items.length === 0) {
    lines.push("- 无")
  } else {
    for (const item of items) {
      lines.push(`- ${item}`)
    }
  }

  lines.push("")
}

function translateStatus(status) {
  if (status === "ok") {
    return "通过"
  }

  if (status === "missing") {
    return "缺失"
  }

  return "格式无效"
}

function runDoctor(cwd = process.cwd()) {
  const { env, sourceFiles } = loadAvailableEnv(cwd)
  const result = analyzeEnv(env)
  const report = formatDoctorReport(result, { sourceFiles })

  return {
    ...result,
    report,
    sourceFiles
  }
}

if (require.main === module) {
  const { report, summary } = runDoctor()

  console.log(report)
  process.exit(summary.canStart ? 0 : 1)
}

module.exports = {
  analyzeEnv,
  formatDoctorReport,
  loadAvailableEnv,
  loadEnvFile,
  runDoctor
}
