import axios from "axios";
import { eq } from "drizzle-orm";

import db from "../db";
import { gmailAccounts } from "../db/schema/gmailAccounts";

export type GmailAccountRow = typeof gmailAccounts.$inferSelect;

export async function ensureFreshAccessToken(
  row: GmailAccountRow
): Promise<string> {
  const now = Date.now();
  const expiryMs = row.tokenExpiry
    ? new Date(row.tokenExpiry).getTime()
    : 0;
  const freshEnough = row.accessToken && expiryMs > now + 60_000;
  if (freshEnough) {
    return row.accessToken;
  }

  if (!row.refreshToken) {
    return row.accessToken;
  }

  const res = await axios.post(
    "https://oauth2.googleapis.com/token",
    new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: row.refreshToken,
      grant_type: "refresh_token",
    }),
    {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    }
  );

  const accessToken = res.data?.access_token as string | undefined;
  const expiresIn = res.data?.expires_in as number | undefined;
  if (!accessToken) {
    throw new Error("Token refresh did not return access_token");
  }

  const tokenExpiry =
    typeof expiresIn === "number"
      ? new Date(Date.now() + expiresIn * 1000)
      : null;

  await db
    .update(gmailAccounts)
    .set({
      accessToken,
      tokenExpiry,
      updatedAt: new Date(),
    })
    .where(eq(gmailAccounts.id, row.id));

  return accessToken;
}
