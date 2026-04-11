"use client"

import { LogOut, Menu, Settings } from "lucide-react"
import { signOut, useSession } from "next-auth/react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button, buttonVariants } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import { useSessionStore } from "@/store/session-store"
import { useSettingsStore } from "@/store/settings-store"
import { AVAILABLE_MODELS } from "@/types/model"

export function Header({
  onOpenSettings
}: {
  onOpenSettings: () => void
}) {
  const { data: session } = useSession()
  const { toggleSessionList } = useSettingsStore()
  const { currentModel, setModel } = useSessionStore()

  const currentModelName =
    AVAILABLE_MODELS.find((model) => model.id === currentModel)?.name ??
    currentModel

  return (
    <header className="flex h-14 items-center justify-between border-b px-4">
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          aria-label="打开会话列表"
          onClick={toggleSessionList}
        >
          <Menu className="h-5 w-5" />
        </Button>
        <span className="font-semibold">ChatFlow</span>
      </div>

      <div className="flex items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger
            aria-label="当前模型"
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            {currentModelName}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {AVAILABLE_MODELS.map((model) => (
              <DropdownMenuItem
                key={model.id}
                onClick={() => setModel(model.id)}
              >
                {model.name}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <Button
          variant="ghost"
          size="icon"
          aria-label="打开设置"
          onClick={onOpenSettings}
        >
          <Settings className="h-5 w-5" />
        </Button>

        {session?.user ? (
          <DropdownMenu>
            <DropdownMenuTrigger
              aria-label="打开用户菜单"
              className={cn(
                buttonVariants({ variant: "ghost", size: "icon" }),
                "rounded-full"
              )}
            >
              <Avatar className="h-8 w-8">
                <AvatarImage src={session.user.image ?? ""} />
                <AvatarFallback>{session.user.name?.[0] ?? "U"}</AvatarFallback>
              </Avatar>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => signOut()}>
                <LogOut className="mr-2 h-4 w-4" />
                退出登录
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
      </div>
    </header>
  )
}
