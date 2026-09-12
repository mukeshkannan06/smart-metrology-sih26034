/**
 * Security & Input Sanitization Utilities
 * Protects against NoSQL injection, Regex Denial of Service (ReDoS),
 * and mass-assignment vulnerabilities.
 */

/**
 * Escapes regex special characters to safely use user input in RegExp or MongoDB $regex queries.
 * Prevents ReDoS attacks and pattern manipulation.
 */
export function escapeRegex(text: string): string {
  if (typeof text !== 'string') return '';
  return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
}

/**
 * Sanitizes a string parameter to prevent MongoDB operator injection.
 * Drops or stringifies objects with `$` keys (e.g. { $gt: "" }, { $where: ... }).
 */
export function sanitizeStringParam(val: unknown, fallback: string = ''): string {
  if (val === null || val === undefined) {
    return fallback;
  }
  if (typeof val === 'string') {
    return val.trim();
  }
  if (typeof val === 'number' || typeof val === 'boolean') {
    return String(val);
  }
  // Rejects plain objects/arrays passed where a string is expected
  return fallback;
}

/**
 * Whitelists object keys to protect against mass-assignment privilege escalation
 * (e.g. attempting to inject `role: 'ASSISTANT_CONTROLLER'`, `isAdmin: true`, `isOwner: true`).
 */
export function whitelistFields<T extends Record<string, any>>(
  source: Record<string, any>,
  allowedFields: (keyof T | string)[]
): Partial<T> {
  const sanitized: Record<string, any> = {};
  if (!source || typeof source !== 'object') {
    return sanitized as Partial<T>;
  }

  for (const field of allowedFields) {
    const key = String(field);
    if (Object.prototype.hasOwnProperty.call(source, key)) {
      sanitized[key] = source[key];
    }
  }

  return sanitized as Partial<T>;
}

