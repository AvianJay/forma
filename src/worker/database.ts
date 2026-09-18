import initialSchema from '../../migrations/0001_links.sql?raw';

export class ServiceConfigurationError extends Error {
  constructor(public readonly code: 'database_binding_missing' | 'rate_limiter_binding_missing') {
    super('服務設定尚未完成，請聯絡網站管理者');
  }
}

function isMissingLinksTable(error: unknown): boolean {
  // Inspect only known error messages; never log raw SQL, request values or credentials.
  let current = error;
  for (let depth = 0; depth < 3 && current instanceof Error; depth++) {
    if (/\bno such table:\s*(?:main\.)?links(?:\s|:|$)/i.test(current.message)) return true;
    current = current.cause;
  }
  return false;
}

export async function withLinksTable<T>(db: D1Database, operation: () => Promise<T>): Promise<T> {
  if (!db || typeof db.prepare !== 'function') {
    throw new ServiceConfigurationError('database_binding_missing');
  }
  try {
    return await operation();
  } catch (error) {
    if (!isMissingLinksTable(error)) throw error;
    // Workers Builds can deploy a bound D1 database before its first migration is applied.
    // This additive, idempotent baseline is safe for concurrent first requests. Existing
    // tables and rows are untouched; other database failures are never treated as empty DBs.
    await db.prepare(initialSchema).run();
    return operation();
  }
}
