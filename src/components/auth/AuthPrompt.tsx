import { buttonVariants } from "@/components/ui/button"

interface AuthPromptProps {
  title: string
  description: string
  className?: string
}

export function AuthPrompt({
  title,
  description,
  className
}: AuthPromptProps) {
  return (
    <div
      className={[
        "rounded-2xl border border-border bg-muted/40 p-4 text-left",
        className
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      <p className="mt-1 text-sm leading-6 text-muted-foreground">
        {description}
      </p>
      <div className="mt-4">
        <a
          href="/login"
          className={buttonVariants({ variant: "outline", size: "sm" })}
        >
          登录
        </a>
      </div>
    </div>
  )
}
