const STRING_ARGUMENT_TOOL_FIELDS: Record<string, string> = {
  Bash: 'command',
  Read: 'file_path',
  Write: 'file_path',
  Edit: 'file_path',
  Glob: 'pattern',
  Grep: 'pattern',
}

function isBlankString(value: string): boolean {
  return value.trim().length === 0
}

function isLikelyStructuredObjectLiteral(value: string): boolean {
  // Match object-like patterns with key-value syntax:
  // {"key":, {key:, {'key':, { "key" :, etc.
  // But NOT bash compound commands like { pwd; } or { echo hi; }
  return /^\s*\{\s*['"]?\w+['"]?\s*:/.test(value)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function getPlainStringToolArgumentField(toolName: string): string | null {
  return STRING_ARGUMENT_TOOL_FIELDS[toolName] ?? null
}

export function hasToolFieldMapping(toolName: string): boolean {
  return toolName in STRING_ARGUMENT_TOOL_FIELDS
}

function wrapPlainStringToolArguments(
  toolName: string,
  value: string,
): Record<string, string> | null {
  const field = getPlainStringToolArgumentField(toolName)
  if (!field) return null
  return { [field]: value }
}

export function normalizeToolArguments(
  toolName: string,
  rawArguments: string | undefined | Record<string, unknown>,
): unknown {
  // If already an object, use it directly
  if (typeof rawArguments === 'object' && rawArguments !== null && !Array.isArray(rawArguments)) {
    return rawArguments
  }

  if (rawArguments === undefined) return {}

  // For logging/debugging
  const isString = typeof rawArguments === 'string'
  const argString = rawArguments as string

  try {
    // First, try parsing as-is
    const parsed = JSON.parse(argString)
    if (isRecord(parsed)) {
      return parsed
    }
    // Parsed as a non-object JSON value (string, number, boolean, null, array)
    if (typeof parsed === 'string' && !isBlankString(parsed)) {
      return wrapPlainStringToolArguments(toolName, parsed) ?? parsed
    }
    // For blank strings, booleans, null, arrays — pass through as-is
    return parsed
  } catch (e) {
    // First parse failed - try unescaping the string before parsing
    try {
      // Unescape: replace \" with ", \\ with \, but preserve actual escape sequences
      const unescaped = argString
        .replace(/\\"/g, '"')
        .replace(/\\\\/g, '\\')

      const parsed = JSON.parse(unescaped)
      if (isRecord(parsed)) {
        return parsed
      }
      // Parsed as a non-object JSON value
      if (typeof parsed === 'string' && !isBlankString(parsed)) {
        return wrapPlainStringToolArguments(toolName, parsed) ?? parsed
      }
      return parsed
    } catch (e2) {
      // Both parse attempts failed - treat as plain string or return empty
      if (isBlankString(argString) || isLikelyStructuredObjectLiteral(argString)) {
        return {}
      }
      return wrapPlainStringToolArguments(toolName, argString) ?? {}
    }
  }
}
