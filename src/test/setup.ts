import '@testing-library/jest-dom'

// Ensure Web Crypto API is available in the test environment (jsdom).
// Node 18+ includes webcrypto on globalThis.crypto, but jsdom may not expose it.
if (typeof globalThis.crypto === 'undefined' || !globalThis.crypto.subtle) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { webcrypto } = require('crypto')
  Object.defineProperty(globalThis, 'crypto', {
    value: webcrypto,
    writable: false,
    configurable: true,
  })
}
