import type { NextAuthConfig } from "next-auth"
import GitHub from "next-auth/providers/github"

type AuthEnv = {
  GOOGLE_CLIENT_ID?: string
  GOOGLE_CLIENT_SECRET?: string
  GITHUB_CLIENT_ID?: string
  GITHUB_CLIENT_SECRET?: string
}

type GoogleUserProfile = {
  sub: string
  name?: string
  email?: string
  picture?: string
}

export function createAuthProviders(env: AuthEnv = process.env as AuthEnv) {
  const providers = []

  if (env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET) {
    providers.push(
      {
        id: "google",
        name: "Google",
        type: "oauth",
        issuer: "https://accounts.google.com",
        clientId: env.GOOGLE_CLIENT_ID,
        clientSecret: env.GOOGLE_CLIENT_SECRET,
        authorization: {
          url: "https://accounts.google.com/o/oauth2/v2/auth",
          params: {
            scope: "openid profile email"
          }
        },
        token: "https://oauth2.googleapis.com/token",
        userinfo: "https://openidconnect.googleapis.com/v1/userinfo",
        profile(profile: GoogleUserProfile) {
          return {
            id: profile.sub,
            name: profile.name ?? null,
            email: profile.email ?? null,
            image: profile.picture ?? null
          }
        }
      } satisfies NonNullable<NextAuthConfig["providers"]>[number]
    )
  }

  if (env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET) {
    providers.push(
      GitHub({
        clientId: env.GITHUB_CLIENT_ID,
        clientSecret: env.GITHUB_CLIENT_SECRET
      })
    )
  }

  return providers
}

export const authConfig = {
  trustHost: true,
  providers: createAuthProviders(),
  session: {
    strategy: "jwt"
  },
  pages: {
    signIn: "/login"
  },
  callbacks: {
    jwt({ token, user }) {
      if (user?.id) {
        token.sub = user.id
      }

      return token
    },
    session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub
      }

      return session
    }
  }
} satisfies NextAuthConfig
