/** @jest-environment node */
const path = require("node:path")
const fs = require("node:fs")
const os = require("node:os")

const { analyzeEnv, formatDoctorReport, loadEnvFile } = require("../../scripts/doctor.cjs")

describe("doctor script", () => {
  it("should flag missing startup and integration variables separately", () => {
    const result = analyzeEnv({})

    expect(result.summary.canStart).toBe(false)
    expect(result.summary.canRunRealIntegration).toBe(false)
    expect(result.blockers.startupMissing).toEqual(
      expect.arrayContaining([
        "POSTGRES_PRISMA_URL",
        "POSTGRES_URL_NON_POOLING",
        "NEXTAUTH_URL",
        "NEXTAUTH_SECRET",
        "ENCRYPTION_KEY"
      ])
    )
    expect(result.blockers.integrationMissing).toEqual(
      expect.arrayContaining([
        "GOOGLE_CLIENT_ID",
        "GOOGLE_CLIENT_SECRET",
        "GITHUB_CLIENT_ID",
        "GITHUB_CLIENT_SECRET"
      ])
    )
  })

  it("should flag invalid formats without treating valid values as missing", () => {
    const result = analyzeEnv({
      POSTGRES_PRISMA_URL: "postgres://user:pass@host:5432/chatflow",
      POSTGRES_URL_NON_POOLING: "postgres://user:pass@host:5432/chatflow",
      NEXTAUTH_URL: "not-a-url",
      NEXTAUTH_SECRET: "secret-value",
      ENCRYPTION_KEY: "xyz",
      GOOGLE_CLIENT_ID: "google-id",
      GOOGLE_CLIENT_SECRET: "google-secret",
      GITHUB_CLIENT_ID: "github-id",
      GITHUB_CLIENT_SECRET: "github-secret"
    })

    expect(result.blockers.startupMissing).toEqual([])
    expect(result.blockers.integrationMissing).toEqual([])
    expect(result.blockers.startupInvalid).toEqual(
      expect.arrayContaining(["NEXTAUTH_URL", "ENCRYPTION_KEY"])
    )
    expect(result.summary.canStart).toBe(false)
    expect(result.summary.canRunRealIntegration).toBe(false)
  })

  it("should treat a fully valid environment as ready for local integration", () => {
    const result = analyzeEnv({
      POSTGRES_PRISMA_URL: "postgres://user:pass@host:5432/chatflow?sslmode=require&pgbouncer=true",
      POSTGRES_URL_NON_POOLING: "postgres://user:pass@host:5432/chatflow?sslmode=require",
      NEXTAUTH_URL: "http://localhost:3000",
      NEXTAUTH_SECRET: "a-strong-nextauth-secret",
      ENCRYPTION_KEY: "a".repeat(64),
      GOOGLE_CLIENT_ID: "google-id",
      GOOGLE_CLIENT_SECRET: "google-secret",
      GITHUB_CLIENT_ID: "github-id",
      GITHUB_CLIENT_SECRET: "github-secret"
    })

    expect(result.summary.canStart).toBe(true)
    expect(result.summary.canRunRealIntegration).toBe(true)
    expect(result.suggestions).toEqual([
      "运行 npm run verify:local",
      "确认数据库与 OAuth 配置可用后，按照 docs/local-qa-checklist.md 逐项联调"
    ])
  })

  it("should render a readable report with next steps", () => {
    const report = formatDoctorReport(
      analyzeEnv({
        POSTGRES_PRISMA_URL: "postgres://user:pass@host:5432/chatflow",
        POSTGRES_URL_NON_POOLING: "postgres://user:pass@host:5432/chatflow",
        NEXTAUTH_URL: "http://localhost:3000",
        NEXTAUTH_SECRET: "secret-value",
        ENCRYPTION_KEY: "a".repeat(64)
      })
    )

    expect(report).toContain("ChatFlow Local Doctor")
    expect(report).toContain("启动阻塞项")
    expect(report).toContain("真实联调阻塞项")
    expect(report).toContain("GOOGLE_CLIENT_ID")
    expect(report).toContain("运行 npm run verify:local")
  })

  it("should load key-value pairs from an env file", () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "chatflow-doctor-"))
    const envPath = path.join(tempDir, ".env.local")

    fs.writeFileSync(
      envPath,
      [
        'NEXTAUTH_URL="http://localhost:3000"',
        "NEXTAUTH_SECRET=secret-value",
        "# comment line",
        "ENCRYPTION_KEY=abcdef"
      ].join("\n")
    )

    expect(loadEnvFile(envPath)).toEqual({
      NEXTAUTH_URL: "http://localhost:3000",
      NEXTAUTH_SECRET: "secret-value",
      ENCRYPTION_KEY: "abcdef"
    })
  })
})
