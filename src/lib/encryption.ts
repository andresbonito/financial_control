// AES-256-GCM encryption using the native Web Crypto API — no external dependencies.
// Keys are derived with PBKDF2 from userId + salt (never stored in plaintext).

const PBKDF2_ITERATIONS = 100_000
const enc = new TextEncoder()
const dec = new TextDecoder()

function buf2hex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

function hex2buf(hex: string): ArrayBuffer {
  const arr = new Uint8Array(hex.length / 2)
  for (let i = 0; i < hex.length; i += 2) {
    arr[i / 2] = parseInt(hex.slice(i, i + 2), 16)
  }
  return arr.buffer as ArrayBuffer
}

export async function generateUserKey(userId: string, salt: string): Promise<CryptoKey> {
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(userId),
    'PBKDF2',
    false,
    ['deriveKey'],
  )
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: enc.encode(salt),
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  )
}

// Returns "ivHex:cipherHex" — safe to store as a string in Supabase.
export async function encryptData(data: string, key: CryptoKey): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const cipher = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    enc.encode(data),
  )
  return `${buf2hex(iv.buffer as ArrayBuffer)}:${buf2hex(cipher)}`
}

export async function decryptData(cipher: string, key: CryptoKey): Promise<string> {
  const [ivHex, dataHex] = cipher.split(':')
  const plain = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: new Uint8Array(hex2buf(ivHex)) },
    key,
    hex2buf(dataHex),
  )
  return dec.decode(plain)
}

// Returns true if the string looks like an AES-GCM encrypted value ("24hexIV:cipherHex")
export function isEncryptedFormat(value: string): boolean {
  return /^[0-9a-f]{24}:[0-9a-f]+$/.test(value)
}

// Decrypts if the value is in encrypted format; returns the original string otherwise (handles legacy plaintext)
export async function safeDecrypt(value: string | null | undefined, key: CryptoKey): Promise<string | null> {
  if (!value) return value ?? null
  if (!isEncryptedFormat(value)) return value
  try { return await decryptData(value, key) } catch { return value }
}
