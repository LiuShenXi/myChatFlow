"use client"

import { useSession } from "next-auth/react"
import { AuthPrompt } from "@/components/auth/AuthPrompt"
import { ApiKeyManager } from "@/components/settings/ApiKeyManager"
import { CustomModelManager } from "@/components/settings/CustomModelManager"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog"
import { Separator } from "@/components/ui/separator"

export function SettingsDialog({
  open,
  onOpenChange
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { status } = useSession()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>设置</DialogTitle>
        </DialogHeader>

        <Separator />

        {status === "unauthenticated" ? (
          <AuthPrompt
            title="登录后才能配置 API Key"
            description="当前未登录，无法读取或保存你的模型密钥。"
          />
        ) : status === "loading" ? (
          <p className="text-sm text-muted-foreground">正在检查登录状态...</p>
        ) : (
          <div className="space-y-4">
            <ApiKeyManager />
            <Separator />
            <CustomModelManager />
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
