export default function Home() {
  return (
    <main className="flex flex-1 items-center justify-center bg-slate-950 px-6 py-16 text-slate-50">
      <div className="w-full max-w-3xl rounded-3xl border border-white/10 bg-white/5 p-10 shadow-2xl shadow-black/30 backdrop-blur">
        <div className="space-y-4">
          <p className="text-sm uppercase tracking-[0.3em] text-sky-300">
            ChatFlow
          </p>
          <h1 className="text-4xl font-semibold tracking-tight">
            项目脚手架已就绪，正在进入功能开发阶段
          </h1>
          <p className="max-w-2xl text-base leading-7 text-slate-300">
            当前页面用于验证 Next.js、Tailwind 和 TypeScript 的基础配置。
            后续会替换为认证路由、对话主界面、会话抽屉和设置面板。
          </p>
        </div>
      </div>
    </main>
  )
}
