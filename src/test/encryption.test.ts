import { describe, it, expect } from 'vitest'
import { generateUserKey, encryptData, decryptData } from '../lib/encryption'

describe('encryption', () => {
  it('encrypt/decrypt roundtrip returns original string', async () => {
    const key = await generateUserKey('user-123', 'random-salt-abc')
    const original = 'Conta de luz - R$ 150,00'
    const cipher = await encryptData(original, key)
    const plain = await decryptData(cipher, key)
    expect(plain).toBe(original)
  })

  it('encrypted value is different from plaintext', async () => {
    const key = await generateUserKey('user-123', 'salt')
    const original = 'sensitive data'
    const cipher = await encryptData(original, key)
    expect(cipher).not.toBe(original)
  })

  it('two encryptions of same text produce different ciphertexts (unique IV)', async () => {
    const key = await generateUserKey('user-abc', 'salt-xyz')
    const text = 'same text'
    const c1 = await encryptData(text, key)
    const c2 = await encryptData(text, key)
    expect(c1).not.toBe(c2)
  })

  it('decryption fails with wrong key', async () => {
    const key1 = await generateUserKey('user-1', 'salt')
    const key2 = await generateUserKey('user-2', 'salt')
    const cipher = await encryptData('secret', key1)
    await expect(decryptData(cipher, key2)).rejects.toThrow()
  })

  it('generates different keys for different userIds', async () => {
    const salt = 'common-salt'
    const key1 = await generateUserKey('user-AAA', salt)
    const key2 = await generateUserKey('user-BBB', salt)
    const cipher1 = await encryptData('data', key1)
    await expect(decryptData(cipher1, key2)).rejects.toThrow()
  })

  it('handles unicode strings correctly', async () => {
    const key = await generateUserKey('uid', 'salt')
    const unicode = 'Pagamento: R$ 1.234,56 — café & pão 🍞'
    const cipher = await encryptData(unicode, key)
    const plain = await decryptData(cipher, key)
    expect(plain).toBe(unicode)
  })
})
