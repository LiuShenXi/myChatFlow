import { decrypt, encrypt } from "@/lib/auth/encryption"

const TEST_KEY = "a".repeat(64)

beforeAll(() => {
  process.env.ENCRYPTION_KEY = TEST_KEY
})

describe("encryption", () => {
  it("should encrypt and decrypt a string correctly", () => {
    const plaintext = "sk-test-api-key-12345"
    const encrypted = encrypt(plaintext)
    const decrypted = decrypt(encrypted)

    expect(decrypted).toBe(plaintext)
  })

  it("should produce different ciphertexts for the same input", () => {
    const plaintext = "sk-test-api-key-12345"
    const encrypted1 = encrypt(plaintext)
    const encrypted2 = encrypt(plaintext)

    expect(encrypted1).not.toBe(encrypted2)
  })

  it("should produce ciphertext in iv:authTag:data format", () => {
    const encrypted = encrypt("test")
    const parts = encrypted.split(":")

    expect(parts).toHaveLength(3)
    expect(parts[0]).toHaveLength(32)
    expect(parts[1]).toHaveLength(32)
    expect(parts[2].length).toBeGreaterThan(0)
  })

  it("should throw on tampered ciphertext", () => {
    const encrypted = encrypt("test")
    const parts = encrypted.split(":")
    const tampered = `${parts[0]}:${parts[1]}:ff${parts[2].slice(2)}`

    expect(() => decrypt(tampered)).toThrow()
  })

  it("should handle empty string", () => {
    const encrypted = encrypt("")
    const decrypted = decrypt(encrypted)

    expect(decrypted).toBe("")
  })

  it("should handle unicode content", () => {
    const plaintext = "这是一个中文API密钥"
    const encrypted = encrypt(plaintext)
    const decrypted = decrypt(encrypted)

    expect(decrypted).toBe(plaintext)
  })
})
