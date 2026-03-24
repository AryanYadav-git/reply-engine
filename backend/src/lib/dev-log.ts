/**
 * Development-only structured logs. Disabled when NODE_ENV=production.
 * Override locally with DEV_LOGGING=0 to silence.
 */
export function devLog(
  scope: string,
  message: string,
  data?: Record<string, unknown>
): void {
  if (process.env.NODE_ENV === "production") return;
  if (process.env.DEV_LOGGING === "0" || process.env.DEV_LOGGING === "false") {
    return;
  }
  const prefix = `[umbrella:dev][${scope}]`;
  if (data !== undefined) {
    console.log(prefix, message, data);
  } else {
    console.log(prefix, message);
  }
}
