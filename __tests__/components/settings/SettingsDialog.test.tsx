import { render, screen } from "@testing-library/react"
import { SettingsDialog } from "@/components/settings/SettingsDialog"

jest.mock("@/components/ui/dialog", () => ({
  Dialog: ({
    open,
    children
  }: {
    open: boolean
    children: React.ReactNode
  }) => (open ? <div>{children}</div> : null),
  DialogContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  DialogHeader: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  DialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>
}))

jest.mock("@/components/ui/separator", () => ({
  Separator: () => <hr />
}))

jest.mock("@/components/settings/ApiKeyManager", () => ({
  ApiKeyManager: () => <div>API Key 管理器</div>
}))

describe("SettingsDialog", () => {
  it("should not render content when closed", () => {
    render(<SettingsDialog open={false} onOpenChange={jest.fn()} />)

    expect(screen.queryByText("设置")).not.toBeInTheDocument()
  })

  it("should render the dialog title and api key manager when open", () => {
    render(<SettingsDialog open={true} onOpenChange={jest.fn()} />)

    expect(screen.getByText("设置")).toBeInTheDocument()
    expect(screen.getByText("API Key 管理器")).toBeInTheDocument()
  })
})
