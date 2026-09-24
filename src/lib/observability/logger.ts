export function logAppError(context: string, error: unknown, meta?: Record<string, unknown>) {
  const message = error instanceof Error
    ? error.message
    : typeof error === 'string'
      ? error
      : JSON.stringify(error || {});
  const details = {
    context,
    message,
    ...(meta || {}),
  };

  // Centralized diagnostics without triggering Next.js dev error overlay for handled flows.
  console.warn('[APP_ERROR]', details);
}
