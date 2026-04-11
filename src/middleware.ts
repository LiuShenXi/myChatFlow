import NextAuth from "next-auth"
import { authConfig } from "@/lib/auth/auth.config"

export const { auth: middleware } = NextAuth(authConfig)

export const config = {
  matcher: ["/api/chat/:path*", "/api/sessions/:path*", "/api/keys/:path*"]
}
