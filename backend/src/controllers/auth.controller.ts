import { Context } from "hono";
import { eq } from "drizzle-orm";
import db from "../db";
import { gmailAccounts } from "../db/schema/gmailAccounts";
import { users } from "../db/schema/user";
import {
  exchangeCodeForToken,
  getGoogleAuthUrl,
  getUserInfo,
} from "../services/google-auth.service";
import { devLog } from "../lib/dev-log";
import { registerGmailPushWatch } from "../services/gmail-watch.service";
import { signSessionToken, verifySessionToken } from "../services/session.service";

const frontendBase = () => process.env.FRONTEND_URL || "http://localhost:3001";

const redirectWithError = (c: Context, message: string) => {
  const url = new URL("/auth", frontendBase());
  url.searchParams.set("error", message);
  return c.redirect(url.toString());
};

export const signup = async (c: Context) => {
  try {
    const body = await c.req.json();
    const name = String(body.name || "").trim();
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");

    if (!name || !email || !password) {
      return c.json({ error: "Name, email and password are required" }, 400);
    }

    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
    if (existingUser.length > 0) {
      return c.json({ error: "Email already exists" }, 409);
    }

    const passwordHash = await Bun.password.hash(password);
    const created = await db
      .insert(users)
      .values({ name, email, passwordHash })
      .returning({
        id: users.id,
        email: users.email,
        name: users.name,
      });

    const user = created[0];
    const token = await signSessionToken(user);

    return c.json(
      { message: "Signup successful", user, token },
      201
    );
  } catch {
    return c.json({ error: "Invalid request body" }, 400);
  }
};

export const google = async (c: Context) => {
  const googleAuthUrl = getGoogleAuthUrl();
  return c.redirect(googleAuthUrl);
};

export const googleCallback = async (c: Context) => {
  const code = c.req.query("code");
  if (!code) {
    return redirectWithError(c, "missing_code");
  }

  let tokenData: Awaited<ReturnType<typeof exchangeCodeForToken>>;
  try {
    tokenData = await exchangeCodeForToken(code);
  } catch {
    return redirectWithError(c, "token_exchange_failed");
  }

  if (!tokenData?.access_token) {
    return redirectWithError(c, "no_access_token");
  }

  let googleUser: Awaited<ReturnType<typeof getUserInfo>>;
  try {
    googleUser = await getUserInfo(tokenData.access_token);
  } catch {
    return redirectWithError(c, "userinfo_failed");
  }

  const existing = await db
    .select()
    .from(users)
    .where(eq(users.email, googleUser.email))
    .limit(1);

  let user: { id: number; email: string; name: string };

  if (existing.length > 0) {
    user = {
      id: existing[0].id,
      email: existing[0].email,
      name: existing[0].name,
    };
  } else {
    const inserted = await db
      .insert(users)
      .values({
        email: googleUser.email,
        name: googleUser.name || googleUser.email.split("@")[0],
        googleId: googleUser.id,
      })
      .returning({
        id: users.id,
        email: users.email,
        name: users.name,
      });
    user = inserted[0];
  }

  const td = tokenData as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
  };

  const existingGmail = await db
    .select()
    .from(gmailAccounts)
    .where(eq(gmailAccounts.userId, user.id))
    .limit(1);

  const refreshToken =
    typeof td.refresh_token === "string" && td.refresh_token.length > 0
      ? td.refresh_token
      : (existingGmail[0]?.refreshToken ?? "");

  const expiresIn = typeof td.expires_in === "number" ? td.expires_in : undefined;
  const tokenExpiry =
    expiresIn !== undefined
      ? new Date(Date.now() + expiresIn * 1000)
      : null;

  let historyId: string | undefined;
  let watchExpiration: number | undefined;

  if (process.env.GMAIL_PUBSUB_TOPIC?.trim()) {
    try {
      const watchRes = await registerGmailPushWatch(td.access_token!);
      if (typeof watchRes.historyId === "string" && watchRes.historyId.length > 0) {
        historyId = watchRes.historyId;
      }
      if (watchRes.expiration != null && String(watchRes.expiration).length > 0) {
        const exp = Number(watchRes.expiration);
        if (Number.isFinite(exp)) {
          watchExpiration = exp;
        }
      }
      devLog("auth:google-callback", "Gmail watch completed for user", {
        userId: user.id,
        email: user.email,
        historyId: historyId ?? null,
        watchExpirationMs: watchExpiration ?? null,
      });
    } catch (e) {
      console.error("Gmail watch failed:", e);
      return redirectWithError(c, "gmail_watch_failed");
    }
  } else {
    devLog("auth:google-callback", "Gmail watch skipped (GMAIL_PUBSUB_TOPIC unset)", {
      userId: user.id,
      email: user.email,
    });
  }

  try {
    await db
      .insert(gmailAccounts)
      .values({
        userId: user.id,
        accessToken: td.access_token!,
        refreshToken,
        tokenExpiry,
        historyId: historyId ?? null,
        watchExpiration: watchExpiration ?? null,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: gmailAccounts.userId,
        set: {
          accessToken: td.access_token!,
          refreshToken,
          tokenExpiry,
          updatedAt: new Date(),
          ...(historyId !== undefined ? { historyId } : {}),
          ...(watchExpiration !== undefined ? { watchExpiration } : {}),
        },
      });
  } catch (e) {
    console.error("Failed to persist Gmail account tokens:", e);
    return redirectWithError(c, "gmail_account_save_failed");
  }

  try {
    const sessionToken = await signSessionToken(user);
    const dashboard = new URL("/dashboard", frontendBase());
    dashboard.searchParams.set("token", sessionToken);
    return c.redirect(dashboard.toString());
  } catch (e) {
    console.error(e);
    return redirectWithError(c, "session_failed");
  }
};

export const signin = async (c: Context) => {
  try {
    const body = await c.req.json();
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");

    if (!email || !password) {
      return c.json({ error: "Email and password are required" }, 400);
    }

    const found = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
    if (found.length === 0 || !found[0].passwordHash) {
      return c.json({ error: "Invalid credentials" }, 401);
    }

    const validPassword = await Bun.password.verify(
      password,
      found[0].passwordHash
    );
    if (!validPassword) {
      return c.json({ error: "Invalid credentials" }, 401);
    }

    const user = {
      id: found[0].id,
      email: found[0].email,
      name: found[0].name,
    };
    const token = await signSessionToken(user);

    return c.json({
      message: "Signin successful",
      user,
      token,
    });
  } catch {
    return c.json({ error: "Invalid request body" }, 400);
  }
};

export const me = async (c: Context) => {
  const header = c.req.header("Authorization");
  if (!header?.startsWith("Bearer ")) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  const raw = header.slice(7).trim();
  if (!raw) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  try {
    const { userId } = await verifySessionToken(raw);
    const row = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (row.length === 0) {
      return c.json({ error: "User not found" }, 401);
    }

    return c.json({ user: row[0] });
  } catch {
    return c.json({ error: "Invalid or expired session" }, 401);
  }
};
