jest.mock("next-auth/providers/google", () => ({
  __esModule: true,
  default: jest.fn(() => ({
    id: "google",
    name: "Google",
    type: "oauth"
  }))
}))

jest.mock("next-auth/providers/github", () => ({
  __esModule: true,
  default: jest.fn(() => ({
    id: "github",
    name: "GitHub",
    type: "oauth"
  }))
}))

import { authConfig } from "@/lib/auth/auth.config"
import { createAuthProviders } from "@/lib/auth/auth.config"

describe("authConfig", () => {
  it("should trust the request host for local Auth.js routes", () => {
    expect(authConfig.trustHost).toBe(true)
  })

  it("should only register OAuth providers that have both client id and secret", () => {
    const providers = createAuthProviders({
      GOOGLE_CLIENT_ID: "google-client-id",
      GOOGLE_CLIENT_SECRET: "google-client-secret",
      GITHUB_CLIENT_ID: "",
      GITHUB_CLIENT_SECRET: ""
    })

    expect(providers).toHaveLength(1)
    expect(providers[0].id).toBe("google")
  })
})
