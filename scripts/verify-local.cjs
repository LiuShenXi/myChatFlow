const { spawn } = require("node:child_process")

const DEFAULT_STEPS = [
  {
    label: "TypeScript",
    command: "npx tsc --noEmit"
  },
  {
    label: "Tests",
    command: "npm test -- --runInBand"
  },
  {
    label: "ESLint",
    command: "npm run lint"
  },
  {
    label: "Build",
    command: "npm run build"
  }
]

async function runVerifyLocal(options = {}) {
  const steps = options.steps ?? DEFAULT_STEPS
  const runCommand = options.runCommand ?? defaultRunCommand
  const logger = options.logger ?? console
  const summary = []
  let success = true

  for (const step of steps) {
    logger.log(`\n>>> ${step.label}: ${step.command}`)

    const result = await runCommand(step.command)
    const status = result.code === 0 ? "passed" : "failed"

    summary.push({
      label: step.label,
      command: step.command,
      status
    })

    if (status === "failed") {
      success = false
      break
    }
  }

  if (!success && summary.length < steps.length) {
    for (const step of steps.slice(summary.length)) {
      summary.push({
        label: step.label,
        command: step.command,
        status: "skipped"
      })
    }
  }

  return {
    success,
    summary
  }
}

function defaultRunCommand(command) {
  return new Promise((resolve) => {
    const child = spawn(command, {
      cwd: process.cwd(),
      shell: true,
      stdio: "inherit"
    })

    child.on("close", (code) => {
      resolve({ code: code ?? 1 })
    })

    child.on("error", () => {
      resolve({ code: 1 })
    })
  })
}

function formatVerifyLocalReport(result) {
  const lines = [
    "ChatFlow Local Verify",
    "=====================",
    `结果: ${result.success ? "PASS" : "FAIL"}`,
    ""
  ]

  for (const item of result.summary) {
    lines.push(`${item.label}: ${item.status.toUpperCase()} (${item.command})`)
  }

  return lines.join("\n")
}

if (require.main === module) {
  runVerifyLocal()
    .then((result) => {
      console.log("")
      console.log(formatVerifyLocalReport(result))
      process.exit(result.success ? 0 : 1)
    })
    .catch((error) => {
      console.error(error)
      process.exit(1)
    })
}

module.exports = {
  DEFAULT_STEPS,
  formatVerifyLocalReport,
  runVerifyLocal
}
