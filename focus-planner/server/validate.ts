import type { Context } from 'hono'

export function jsonField(
  body: Record<string, unknown>,
  key: string,
  fallback: string = '',
): string {
  const val = body[key]
  return typeof val === 'string' ? val : fallback
}

export function jsonBool(body: Record<string, unknown>, key: string): boolean {
  const val = body[key]
  return val === true || val === 1
}

export function jsonNum(body: Record<string, unknown>, key: string, fallback: number = 0): number {
  const val = body[key]
  return typeof val === 'number' && Number.isFinite(val) ? val : fallback
}

export function jsonStrArray(body: Record<string, unknown>, key: string): string[] {
  const val = body[key]
  if (!Array.isArray(val)) return []
  return val.filter((v): v is string => typeof v === 'string')
}

export function requireFields(body: Record<string, unknown>, fields: string[]): string | null {
  for (const f of fields) {
    if (body[f] === undefined || body[f] === null) return `Missing required field: ${f}`
  }
  return null
}

export function checkEnum(
  value: unknown,
  allowed: readonly string[],
  fieldName: string,
): string | null {
  if (typeof value !== 'string') return `${fieldName} must be a string`
  if (!allowed.includes(value)) return `${fieldName} must be one of: ${allowed.join(', ')}`
  return null
}

export function safeJsonParse(raw: string, fallback: unknown = []): unknown {
  try {
    return JSON.parse(raw)
  } catch {
    return fallback
  }
}

export function checkChanges(result: { changes: number }, label: string, c: Context) {
  if (result.changes === 0) return c.json({ error: `${label} not found` }, 404)
  return null
}
