import { fireEvent, render, screen } from "@testing-library/react"
import { LoginActions } from "@/components/auth/LoginActions"

const signInMock = jest.fn()

jest.mock("next-auth/react", () => ({
  signIn: (...args: unknown[]) => signInMock(...args)
}))

describe("LoginActions", () => {
  beforeEach(() => {
    signInMock.mockReset()
  })

  it("should start Google sign-in from the client when Google is configured", () => {
    render(<LoginActions hasGoogleAuth hasGithubAuth={false} />)

    fireEvent.click(screen.getByRole("button", { name: "使用 Google 登录" }))

    expect(signInMock).toHaveBeenCalledWith("google", { callbackUrl: "/" })
  })

  it("should hide GitHub when GitHub is not configured", () => {
    render(<LoginActions hasGoogleAuth hasGithubAuth={false} />)

    expect(
      screen.queryByRole("button", { name: "使用 GitHub 登录" })
    ).not.toBeInTheDocument()
  })
})
