/** @jest-environment node */
const {
  DEFAULT_STEPS,
  formatVerifyLocalReport,
  runVerifyLocal
} = require("../../scripts/verify-local.cjs")

describe("verify-local script", () => {
  const logger = {
    log: jest.fn()
  }

  beforeEach(() => {
    logger.log.mockClear()
  })

  it("should define the expected serial verification steps", () => {
    expect(DEFAULT_STEPS.map((step) => step.command)).toEqual([
      "npx tsc --noEmit",
      "npm test -- --runInBand",
      "npm run lint",
      "npm run build"
    ])
  })

  it("should stop after the first failed command and mark later steps as skipped", async () => {
    const runCommand = jest
      .fn()
      .mockResolvedValueOnce({ code: 0 })
      .mockResolvedValueOnce({ code: 1 })

    const result = await runVerifyLocal({
      runCommand,
      logger
    })

    expect(runCommand).toHaveBeenCalledTimes(2)
    expect(result.success).toBe(false)
    expect(result.summary).toEqual([
      {
        label: "TypeScript",
        command: "npx tsc --noEmit",
        status: "passed"
      },
      {
        label: "Tests",
        command: "npm test -- --runInBand",
        status: "failed"
      },
      {
        label: "ESLint",
        command: "npm run lint",
        status: "skipped"
      },
      {
        label: "Build",
        command: "npm run build",
        status: "skipped"
      }
    ])
  })

  it("should pass when all steps succeed", async () => {
    const runCommand = jest.fn().mockResolvedValue({ code: 0 })

    const result = await runVerifyLocal({
      runCommand,
      logger
    })

    expect(result.success).toBe(true)
    expect(result.summary.every((item) => item.status === "passed")).toBe(true)
  })

  it("should render a readable summary report", () => {
    const report = formatVerifyLocalReport({
      success: false,
      summary: [
        {
          label: "TypeScript",
          command: "npx tsc --noEmit",
          status: "passed"
        },
        {
          label: "Tests",
          command: "npm test -- --runInBand",
          status: "failed"
        },
        {
          label: "ESLint",
          command: "npm run lint",
          status: "skipped"
        }
      ]
    })

    expect(report).toContain("ChatFlow Local Verify")
    expect(report).toContain("TypeScript: PASSED")
    expect(report).toContain("Tests: FAILED")
    expect(report).toContain("ESLint: SKIPPED")
  })
})
