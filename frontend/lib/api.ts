/** Backend API base (Hono). Default matches typical local setup: API :3000, Next :3001 */
export const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:3000";

export const SESSION_TOKEN_KEY = "umbrella_session_token";
