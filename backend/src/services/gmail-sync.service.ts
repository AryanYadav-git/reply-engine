import axios from "axios";
import { and, eq } from "drizzle-orm";

import db from "../db";
import { gmailAccounts } from "../db/schema/gmailAccounts";
import { messages } from "../db/schema/message";
import { threads } from "../db/schema/threads";
import { devLog } from "../lib/dev-log";

import { ensureFreshAccessToken, type GmailAccountRow } from "./google-token.service";

function decodeBase64Url(data: string): string {
  const pad = data.length % 4 === 0 ? "" : "=".repeat(4 - (data.length % 4));
  const b64 = data.replace(/-/g, "+").replace(/_/g, "/") + pad;
  return Buffer.from(b64, "base64").toString("utf8");
}

function headerMap(payload: { headers?: { name?: string; value?: string }[] }) {
  const out: Record<string, string> = {};
  for (const h of payload.headers ?? []) {
    if (h.name && h.value) {
      out[h.name.toLowerCase()] = h.value;
    }
  }
  return out;
}

function collectBodies(part: unknown): { text?: string; html?: string } {
  if (!part || typeof part !== "object") return {};
  const p = part as {
    mimeType?: string;
    body?: { data?: string };
    parts?: unknown[];
  };
  let text: string | undefined;
  let html: string | undefined;
  if (p.mimeType === "text/plain" && p.body?.data) {
    text = decodeBase64Url(p.body.data);
  }
  if (p.mimeType === "text/html" && p.body?.data) {
    html = decodeBase64Url(p.body.data);
  }
  for (const sub of p.parts ?? []) {
    const inner = collectBodies(sub);
    text = text ?? inner.text;
    html = html ?? inner.html;
  }
  return { text, html };
}

function parseGmailMessageResource(
  msg: Record<string, unknown>,
  accountEmail: string
) {
  const payload = (msg.payload ?? {}) as {
    headers?: { name?: string; value?: string }[];
    parts?: unknown[];
    body?: { data?: string };
  };
  const headers = headerMap(payload);
  const from = headers.from ?? "";
  const to = headers.to ?? headers.delivered ?? "";
  const subject = headers.subject ?? null;
  const dateHeader = headers.date;
  const internalMs = msg.internalDate
    ? Number(String(msg.internalDate))
    : NaN;
  const receivedAt = Number.isFinite(internalMs)
    ? new Date(internalMs)
    : dateHeader
      ? new Date(dateHeader)
      : null;

  const bodies = collectBodies(payload);
  if (!bodies.text && !bodies.html && payload.body?.data) {
    const raw = decodeBase64Url(payload.body.data);
    bodies.text = raw;
  }

  const lowerAccount = accountEmail.toLowerCase();
  const fromLower = from.toLowerCase();
  const isInbound = !fromLower.includes(lowerAccount);

  return {
    from,
    to,
    subject,
    bodyText: bodies.text ?? null,
    bodyHtml: bodies.html ?? null,
    headersJson: payload.headers ?? [],
    isInbound,
    receivedAt,
    snippet: typeof msg.snippet === "string" ? msg.snippet : null,
  };
}

async function fetchMessageFull(accessToken: string, messageId: string) {
  const url = `https://gmail.googleapis.com/gmail/v1/users/me/messages/${encodeURIComponent(messageId)}?format=full`;
  const res = await axios.get<Record<string, unknown>>(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return res.data;
}

async function findOrCreateThread(
  gmailAccountId: number,
  gmailThreadId: string,
  subject: string | null,
  snippet: string | null,
  lastMessageAt: Date | null
) {
  const existing = await db
    .select({ id: threads.id })
    .from(threads)
    .where(
      and(
        eq(threads.gmailAccountId, gmailAccountId),
        eq(threads.gmailThreadId, gmailThreadId)
      )
    )
    .limit(1);

  if (existing.length > 0) {
    await db
      .update(threads)
      .set({
        ...(subject != null ? { subject } : {}),
        ...(snippet != null ? { snippet } : {}),
        ...(lastMessageAt != null ? { lastMessageAt } : {}),
        updatedAt: new Date(),
      })
      .where(eq(threads.id, existing[0].id));
    return existing[0].id;
  }

  const inserted = await db
    .insert(threads)
    .values({
      gmailAccountId,
      gmailThreadId,
      subject,
      snippet,
      lastMessageAt,
      updatedAt: new Date(),
    })
    .returning({ id: threads.id });

  return inserted[0].id;
}

async function upsertMessage(
  threadId: string,
  gmailMessageId: string,
  values: {
    from: string;
    to: string;
    subject: string | null;
    bodyText: string | null;
    bodyHtml: string | null;
    headers: unknown;
    isInbound: boolean | null;
    receivedAt: Date | null;
  }
) {
  const existing = await db
    .select({ id: messages.id })
    .from(messages)
    .where(
      and(
        eq(messages.threadId, threadId),
        eq(messages.gmailMessageId, gmailMessageId)
      )
    )
    .limit(1);

  if (existing.length > 0) {
    await db
      .update(messages)
      .set({
        from: values.from,
        to: values.to,
        subject: values.subject,
        bodyText: values.bodyText,
        bodyHtml: values.bodyHtml,
        headers: values.headers as never,
        isInbound: values.isInbound,
        receivedAt: values.receivedAt,
      })
      .where(eq(messages.id, existing[0].id));
    return;
  }

  await db.insert(messages).values({
    threadId,
    gmailMessageId,
    from: values.from,
    to: values.to,
    subject: values.subject,
    bodyText: values.bodyText,
    bodyHtml: values.bodyHtml,
    headers: values.headers as never,
    isInbound: values.isInbound,
    receivedAt: values.receivedAt,
  });
}

async function fetchAndPersistMessage(params: {
  accessToken: string;
  gmailAccountId: number;
  accountEmail: string;
  gmailMessageId: string;
  gmailThreadId: string;
}) {
  const msg = await fetchMessageFull(params.accessToken, params.gmailMessageId);
  const parsed = parseGmailMessageResource(msg, params.accountEmail);
  const threadId = await findOrCreateThread(
    params.gmailAccountId,
    params.gmailThreadId,
    parsed.subject,
    parsed.snippet,
    parsed.receivedAt
  );

  await upsertMessage(threadId, params.gmailMessageId, {
    from: parsed.from,
    to: parsed.to,
    subject: parsed.subject,
    bodyText: parsed.bodyText,
    bodyHtml: parsed.bodyHtml,
    headers: parsed.headersJson,
    isInbound: parsed.isInbound,
    receivedAt: parsed.receivedAt,
  });

  devLog("gmail:sync", "Persisted message", {
    gmailMessageId: params.gmailMessageId,
    threadId: params.gmailThreadId,
  });
}

/**
 * Uses stored gmail_accounts.historyId as startHistoryId, then fetches new
 * messages via history.list + messages.get and updates checkpoint to notificationHistoryId.
 */
export async function syncGmailHistoryFromNotification(params: {
  account: GmailAccountRow;
  accountEmail: string;
  notificationHistoryId: string;
}): Promise<void> {
  const { account, accountEmail, notificationHistoryId } = params;
  const accessToken = await ensureFreshAccessToken(account);
  const startHistoryId = account.historyId?.trim();

  if (!startHistoryId) {
    devLog("gmail:sync", "No historyId on gmail_accounts; setting checkpoint only", {
      notificationHistoryId,
    });
    await db
      .update(gmailAccounts)
      .set({
        historyId: notificationHistoryId,
        updatedAt: new Date(),
      })
      .where(eq(gmailAccounts.id, account.id));
    return;
  }

  const collected: { id: string; threadId: string }[] = [];
  let pageToken: string | undefined;

  try {
    do {
      const url = new URL(
        "https://gmail.googleapis.com/gmail/v1/users/me/history"
      );
      url.searchParams.set("startHistoryId", startHistoryId);
      url.searchParams.set("historyTypes", "messageAdded");
      if (pageToken) {
        url.searchParams.set("pageToken", pageToken);
      }

      const res = await axios.get<{
        history?: {
          messagesAdded?: { message?: { id?: string; threadId?: string } }[];
        }[];
        nextPageToken?: string;
      }>(url.toString(), {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      for (const h of res.data.history ?? []) {
        for (const ma of h.messagesAdded ?? []) {
          const m = ma.message;
          if (m?.id && m?.threadId) {
            collected.push({ id: m.id, threadId: m.threadId });
          }
        }
      }
      pageToken = res.data.nextPageToken;
    } while (pageToken);
  } catch (e) {
    if (axios.isAxiosError(e) && e.response?.status === 404) {
      devLog("gmail:sync", "history.list returned 404; advancing checkpoint", {
        startHistoryId,
        notificationHistoryId,
      });
      await db
        .update(gmailAccounts)
        .set({
          historyId: notificationHistoryId,
          updatedAt: new Date(),
        })
        .where(eq(gmailAccounts.id, account.id));
      return;
    }
    throw e;
  }

  const seen = new Set<string>();
  for (const ref of collected) {
    if (seen.has(ref.id)) continue;
    seen.add(ref.id);
    try {
      await fetchAndPersistMessage({
        accessToken,
        gmailAccountId: account.id,
        accountEmail,
        gmailMessageId: ref.id,
        gmailThreadId: ref.threadId,
      });
    } catch (err) {
      console.error("gmail:sync message persist failed", ref.id, err);
    }
  }

  await db
    .update(gmailAccounts)
    .set({
      historyId: notificationHistoryId,
      updatedAt: new Date(),
    })
    .where(eq(gmailAccounts.id, account.id));

  devLog("gmail:sync", "history sync finished", {
    accountId: account.id,
    messagesProcessed: seen.size,
    notificationHistoryId,
  });
}
