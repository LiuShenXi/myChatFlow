'use client'

import { signIn } from "next-auth/react"
import { Button } from "@/components/ui/button"

export function LoginActions({
  hasGoogleAuth,
  hasGithubAuth
}: {
  hasGoogleAuth: boolean
  hasGithubAuth: boolean
}) {
  return (
    <div className="mt-8 flex flex-col gap-3">
      {hasGoogleAuth ? (
        <Button
          className="w-full"
          variant="outline"
          type="button"
          onClick={() => void signIn("google", { callbackUrl: "/" })}
        >
          使用 Google 登录
        </Button>
      ) : null}

      {hasGithubAuth ? (
        <Button
          className="w-full"
          variant="outline"
          type="button"
          onClick={() => void signIn("github", { callbackUrl: "/" })}
        >
          使用 GitHub 登录
        </Button>
      ) : null}

      {!hasGoogleAuth && !hasGithubAuth ? (
        <p className="rounded-2xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-sm leading-6 text-amber-100">
          当前没有可用的 OAuth 登录配置，请先补齐环境变量后再重试。
        </p>
      ) : null}
    </div>
  )
}
