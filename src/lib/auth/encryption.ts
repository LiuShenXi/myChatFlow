import crypto from "node:crypto"

const ALGORITHM = "aes-256-gcm"
const ENCRYPTION_KEY_LENGTH = 32

function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY

  if (!key) {
    throw new Error("ENCRYPTION_KEY environment variable is not set")
  }

  const buffer = Buffer.from(key, "hex")

  if (buffer.length !== ENCRYPTION_KEY_LENGTH) {
    throw new Error("ENCRYPTION_KEY must be a 32-byte hex string")
  }

  return buffer
}

export function encrypt(text: string): string {
  const key = getEncryptionKey()
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv)

  let encrypted = cipher.update(text, "utf8", "hex")
  encrypted += cipher.final("hex")

  const authTag = cipher.getAuthTag()

  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted}`
}

export function decrypt(encryptedData: string): string {
  const key = getEncryptionKey()
  const [ivHex, authTagHex, encrypted] = encryptedData.split(":")

  if (!ivHex || !authTagHex || encrypted === undefined) {
    throw new Error("Encrypted payload is malformed")
  }

  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    key,
    Buffer.from(ivHex, "hex")
  )

  decipher.setAuthTag(Buffer.from(authTagHex, "hex"))

  let decrypted = decipher.update(encrypted, "hex", "utf8")
  decrypted += decipher.final("utf8")

  return decrypted
}
