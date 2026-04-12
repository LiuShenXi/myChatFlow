import { LoginActions } from "@/components/auth/LoginActions"

export default function LoginPage() {
  const hasGoogleAuth =
    Boolean(process.env.GOOGLE_CLIENT_ID) &&
    Boolean(process.env.GOOGLE_CLIENT_SECRET)
  const hasGithubAuth =
    Boolean(process.env.GITHUB_CLIENT_ID) &&
    Boolean(process.env.GITHUB_CLIENT_SECRET)

  return (
    <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white/5 p-8 text-white shadow-2xl shadow-black/30 backdrop-blur">
      <div className="space-y-3 text-center">
        <p className="text-sm uppercase tracking-[0.3em] text-sky-300">
          ChatFlow
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">
          登录后开始你的多模型对话
        </h1>
        <p className="text-sm leading-6 text-slate-300">
          使用 Google 或 GitHub 登录，随后即可配置自己的 API Key。
        </p>
      </div>

      <LoginActions
        hasGoogleAuth={hasGoogleAuth}
        hasGithubAuth={hasGithubAuth}
      />
    </div>
  )
}
