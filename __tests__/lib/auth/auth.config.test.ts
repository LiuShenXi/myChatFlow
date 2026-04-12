jest.mock("next-auth/providers/google", () => ({
  __esModule: true,
  default: jest.fn((options) => ({
    id: "google",
    name: "Google",
    type: "oidc",
    ...options
  }))
}))

jest.mock("next-auth/providers/github", () => ({
  __esModule: true,
  default: jest.fn((options) => ({
    id: "github",
    name: "GitHub",
    type: "oauth",
    ...options
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

  it("should configure Google with explicit OAuth endpoints instead of the default OIDC flow", () => {
    const providers = createAuthProviders({
      GOOGLE_CLIENT_ID: "google-client-id",
      GOOGLE_CLIENT_SECRET: "google-client-secret"
    })

    expect(providers).toHaveLength(1)
    expect(providers[0]).toMatchObject({
      id: "google",
      type: "oauth",
      issuer: "https://accounts.google.com",
      authorization: {
        url: "https://accounts.google.com/o/oauth2/v2/auth",
        params: {
          scope: "openid profile email"
        }
      },
      token: "https://oauth2.googleapis.com/token",
      userinfo: "https://openidconnect.googleapis.com/v1/userinfo"
    })
  })
})
