export type DatabaseSetupGate = { allowed: true } | { allowed: false; status: 401 | 409; error: string }

export function databaseSetupGate(isAuthenticated: boolean, databaseConfigured: boolean): DatabaseSetupGate {
  if (!isAuthenticated) return { allowed: false, status: 401, error: 'Unauthorized' }
  if (databaseConfigured) return { allowed: false, status: 409, error: 'Database is already configured' }
  return { allowed: true }
}
