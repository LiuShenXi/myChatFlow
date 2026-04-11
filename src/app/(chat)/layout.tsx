"use client"

import { useState } from "react"
import { Header } from "@/components/layout/Header"
import { SettingsDialog } from "@/components/settings/SettingsDialog"
import { SessionDrawer } from "@/components/session/SessionDrawer"

export default function ChatLayout({
  children
}: {
  children: React.ReactNode
}) {
  const [settingsOpen, setSettingsOpen] = useState(false)

  return (
    <div className="flex h-screen flex-col bg-background">
      <Header onOpenSettings={() => setSettingsOpen(true)} />

      <div className="flex flex-1 overflow-hidden">
        <SessionDrawer />

        <main className="flex flex-1 flex-col items-center overflow-hidden">
          <div className="flex h-full w-full max-w-3xl flex-col">{children}</div>
        </main>
      </div>

      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
    </div>
  )
}
