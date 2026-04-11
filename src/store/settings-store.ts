import { create } from "zustand"
import { persist } from "zustand/middleware"

type ThemeMode = "light" | "dark" | "system"

interface SettingsStore {
  theme: ThemeMode
  setTheme: (theme: ThemeMode) => void
  showSessionList: boolean
  toggleSessionList: () => void
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      theme: "system",
      setTheme: (theme) => set({ theme }),
      showSessionList: false,
      toggleSessionList: () =>
        set((state) => ({
          showSessionList: !state.showSessionList
        }))
    }),
    {
      name: "chatflow-settings"
    }
  )
)
