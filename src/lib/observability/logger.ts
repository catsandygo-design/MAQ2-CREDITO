export function logAppError(context: string, error: unknown, meta?: Record<string, unknown>) {
  const details = {
    context,
    message: error instanceof Error ? error.message : String(error),
    ...(meta || {}),
  };

  // Centralized error logging point for frontend application flows.
  console.error('[APP_ERROR]', details);
}
