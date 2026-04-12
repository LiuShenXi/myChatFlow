"use client"

import { useEffect, useRef, useState } from "react"
import { Plus } from "lucide-react"
import { useSession } from "next-auth/react"
import { AuthPrompt } from "@/components/auth/AuthPrompt"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle
} from "@/components/ui/sheet"
import { SessionItem } from "@/components/session/SessionItem"
import { useSessionStore } from "@/store/session-store"
import { useSettingsStore } from "@/store/settings-store"
import type { ChatSession } from "@/types/chat"

export function SessionDrawer() {
  const { status } = useSession()
  const showSessionList = useSettingsStore((state) => state.showSessionList)
  const sessions = useSessionStore((state) => state.sessions)
  const currentSessionId = useSessionStore((state) => state.currentSessionId)
  const currentModel = useSessionStore((state) => state.currentModel)
  const setSessions = useSessionStore((state) => state.setSessions)
  const setCurrentSession = useSessionStore((state) => state.setCurrentSession)
  const addSession = useSessionStore((state) => state.addSession)
  const removeSession = useSessionStore((state) => state.removeSession)
  const updateSessionTitle = useSessionStore((state) => state.updateSessionTitle)
  const [hasLoadedSessions, setHasLoadedSessions] = useState(false)
  const [hasAttemptedAutoCreate, setHasAttemptedAutoCreate] = useState(false)
  const [isCreatingInitialSession, setIsCreatingInitialSession] = useState(false)
  const currentSessionIdRef = useRef(currentSessionId)

  useEffect(() => {
    currentSessionIdRef.current = currentSessionId
  }, [currentSessionId])

  useEffect(() => {
    if (status === "loading") {
      return
    }

    if (status === "unauthenticated") {
      setSessions([])
      setCurrentSession(null)
      setHasLoadedSessions(false)
      setHasAttemptedAutoCreate(false)
      setIsCreatingInitialSession(false)
      return
    }

    let isCancelled = false

    async function loadSessions() {
      try {
        const response = await fetch("/api/sessions")

        if (!response.ok) {
          if (!isCancelled) {
            setHasLoadedSessions(true)
          }
          return
        }

        const data = (await response.json()) as ChatSession[]

        if (isCancelled) {
          return
        }

        setSessions(data)
        setHasLoadedSessions(true)
        setHasAttemptedAutoCreate(false)

        if (data.length === 0) {
          setCurrentSession(null)
          return
        }

        const hasCurrentSession = data.some(
          (session) => session.id === currentSessionIdRef.current
        )

        setCurrentSession(
          hasCurrentSession ? currentSessionIdRef.current : (data[0]?.id ?? null)
        )
      } catch {
        if (!isCancelled) {
          setHasLoadedSessions(true)
        }
      }
    }

    void loadSessions()

    return () => {
      isCancelled = true
    }
  }, [setCurrentSession, setSessions, status])

  useEffect(() => {
    if (
      status !== "authenticated" ||
      !hasLoadedSessions ||
      sessions.length > 0 ||
      currentSessionId ||
      hasAttemptedAutoCreate ||
      isCreatingInitialSession
    ) {
      return
    }

    let isCancelled = false

    async function createInitialSession() {
      setHasAttemptedAutoCreate(true)
      setIsCreatingInitialSession(true)

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

        const session = (await response.json()) as ChatSession

        if (isCancelled) {
          return
        }

        addSession(session)
      } catch {
        // Ignore bootstrap failures and keep the UI stable.
      } finally {
        if (!isCancelled) {
          setIsCreatingInitialSession(false)
        }
      }
    }

    void createInitialSession()

    return () => {
      isCancelled = true
    }
  }, [
    addSession,
    currentModel,
    currentSessionId,
    hasAttemptedAutoCreate,
    hasLoadedSessions,
    isCreatingInitialSession,
    sessions.length,
    status
  ])

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

      const session = (await response.json()) as ChatSession
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
      setHasAttemptedAutoCreate(false)
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

        {status === "unauthenticated" ? (
          <div className="p-4">
            <AuthPrompt
              title="登录后才能查看和创建会话"
              description="当前未登录，无法读取历史会话，也不能开始新的对话。"
            />
          </div>
        ) : (
          <>
            <div className="border-b p-4">
              <Button
                type="button"
                onClick={handleCreateSession}
                className="w-full"
                disabled={status !== "authenticated" || isCreatingInitialSession}
              >
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
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}
