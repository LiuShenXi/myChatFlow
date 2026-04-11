"use client"

import { useEffect } from "react"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle
} from "@/components/ui/sheet"
import { useSessionStore } from "@/store/session-store"
import { useSettingsStore } from "@/store/settings-store"
import { SessionItem } from "@/components/session/SessionItem"

export function SessionDrawer() {
  const showSessionList = useSettingsStore((state) => state.showSessionList)
  const sessions = useSessionStore((state) => state.sessions)
  const currentSessionId = useSessionStore((state) => state.currentSessionId)
  const currentModel = useSessionStore((state) => state.currentModel)
  const setSessions = useSessionStore((state) => state.setSessions)
  const setCurrentSession = useSessionStore((state) => state.setCurrentSession)
  const addSession = useSessionStore((state) => state.addSession)
  const removeSession = useSessionStore((state) => state.removeSession)
  const updateSessionTitle = useSessionStore((state) => state.updateSessionTitle)

  useEffect(() => {
    async function loadSessions() {
      try {
        const response = await fetch("/api/sessions")

        if (!response.ok) {
          return
        }

        const data = await response.json()
        setSessions(data)
      } catch {
        // Ignore load failures and keep the current UI state.
      }
    }

    void loadSessions()
  }, [setSessions])

  const handleCreateSession = async () => {
    try {
      const response = await fetch("/api/sessions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ model: currentModel })
      })

      if (!response.ok) {
        return
      }

      const session = await response.json()
      addSession(session)
    } catch {
      // Ignore create failures and keep the current UI state.
    }
  }

  const handleDeleteSession = async (id: string) => {
    try {
      const response = await fetch(`/api/sessions/${id}`, {
        method: "DELETE"
      })

      if (!response.ok) {
        return
      }

      removeSession(id)
    } catch {
      // Ignore delete failures and keep the current UI state.
    }
  }

  const handleRenameSession = async (id: string, title: string) => {
    try {
      const response = await fetch(`/api/sessions/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ title })
      })

      if (!response.ok) {
        return
      }

      updateSessionTitle(id, title)
    } catch {
      // Ignore rename failures and keep the current UI state.
    }
  }

  const handleSelectSession = (id: string) => {
    setCurrentSession(id)
    useSettingsStore.setState({ showSessionList: false })
  }

  return (
    <Sheet
      open={showSessionList}
      onOpenChange={(open) => useSettingsStore.setState({ showSessionList: open })}
    >
      <SheetContent side="left" className="w-80 p-0">
        <SheetHeader className="border-b p-4">
          <SheetTitle>对话记录</SheetTitle>
        </SheetHeader>

        <div className="border-b p-4">
          <Button type="button" onClick={handleCreateSession} className="w-full">
            <Plus className="h-4 w-4" />
            新对话
          </Button>
        </div>

        <ScrollArea className="flex-1 px-4 py-4">
          <div className="space-y-1">
            {sessions.map((session) => (
              <SessionItem
                key={session.id}
                session={session}
                isActive={session.id === currentSessionId}
                onClick={() => handleSelectSession(session.id)}
                onDelete={() => void handleDeleteSession(session.id)}
                onRename={(title) => void handleRenameSession(session.id, title)}
              />
            ))}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  )
}
