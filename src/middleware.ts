export { auth as middleware } from "@/lib/auth/next-auth"

export const config = {
  matcher: ["/api/chat/:path*", "/api/sessions/:path*", "/api/keys/:path*"]
}
