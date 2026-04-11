import { create } from "zustand"
import type { ChatSession } from "@/types/chat"

interface SessionStore {
  sessions: ChatSession[]
  currentSessionId: string | null
  currentModel: string
  setSessions: (sessions: ChatSession[]) => void
  setCurrentSession: (id: string | null) => void
  addSession: (session: ChatSession) => void
  removeSession: (id: string) => void
  updateSessionTitle: (id: string, title: string) => void
  setModel: (model: string) => void
}

export const useSessionStore = create<SessionStore>((set) => ({
  sessions: [],
  currentSessionId: null,
  currentModel: "gpt-4",
  setSessions: (sessions) => set({ sessions }),
  setCurrentSession: (id) => set({ currentSessionId: id }),
  addSession: (session) =>
    set((state) => ({
      sessions: [session, ...state.sessions],
      currentSessionId: session.id
    })),
  removeSession: (id) =>
    set((state) => ({
      sessions: state.sessions.filter((session) => session.id !== id),
      currentSessionId:
        state.currentSessionId === id ? null : state.currentSessionId
    })),
  updateSessionTitle: (id, title) =>
    set((state) => ({
      sessions: state.sessions.map((session) =>
        session.id === id ? { ...session, title } : session
      )
    })),
  setModel: (model) => set({ currentModel: model })
}))
