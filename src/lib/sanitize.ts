// Sanitization helpers for data sent to LLM APIs — prevents prompt injection.

export function sanitizeForPrompt(input: string): string {
  return input
    .replace(/[<>]/g, '')           // Remove HTML-like angle brackets
    .replace(/`/g, "'")             // Replace backticks (used in markdown code blocks)
    .replace(/\r?\n|\r/g, ' ')      // Flatten newlines to spaces
    .replace(/[^\x20-\x7E\u00C0-\u024F]/g, '') // Keep printable ASCII + Latin extended
    .trim()
}

export function truncatePromptInput(input: string, maxLength: number): string {
  if (input.length <= maxLength) return input
  return input.slice(0, maxLength).trimEnd() + '…'
}

// Sanitize an entire financial summary object before sending to the AI.
export function sanitizeFinancialData<T extends object>(data: T): T {
  const result: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(data)) {
    if (typeof value === 'string') {
      result[key] = sanitizeForPrompt(truncatePromptInput(value, 500))
    } else if (typeof value === 'number' || typeof value === 'boolean') {
      result[key] = value
    } else if (Array.isArray(value)) {
      result[key] = value.map((v) =>
        typeof v === 'string' ? sanitizeForPrompt(truncatePromptInput(v, 500)) : v,
      )
    } else {
      result[key] = value
    }
  }
  return result as T
}
