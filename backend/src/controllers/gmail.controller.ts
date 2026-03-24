import { Context } from "hono";
import { eq } from "drizzle-orm";

import db from "../db";
import { gmailAccounts } from "../db/schema/gmailAccounts";
import { gmailWebhookEvents } from "../db/schema/gmailWebhookEvents";
import { users } from "../db/schema/user";
import { devLog } from "../lib/dev-log";
import { syncGmailHistoryFromNotification } from "../services/gmail-sync.service";

type PubSubBody = {
  message?: {
    data?: string;
    messageId?: string;
    publishTime?: string;
  };
  subscription?: string;
};

const decodePubSubMessage = (base64Data: string) => {
  const decoded = Buffer.from(base64Data, "base64").toString("utf8");
  return JSON.parse(decoded) as Record<string, unknown>;
};

export const gmailWebhook = async (c: Context) => {
  const body = (await c.req.json().catch(() => ({}))) as PubSubBody;

  const response = c.json({ ok: true }, 200);

  queueMicrotask(async () => {
    try {
      const encodedData = body.message?.data;
      if (!encodedData) {
        devLog("gmail:webhook", "Pub/Sub push received with no message.data", {
          messageId: body.message?.messageId ?? null,
          subscription: body.subscription ?? null,
        });
        return;
      }

      const decodedMessage = decodePubSubMessage(encodedData);
      const email = String(
        decodedMessage.emailAddress ?? decodedMessage.email ?? ""
      )
        .trim()
        .toLowerCase();
      const historyId = String(decodedMessage.historyId ?? "").trim();

      devLog("gmail:webhook", "Pub/Sub payload decoded", {
        email: email || null,
        historyId: historyId || null,
        pubsubMessageId: body.message?.messageId ?? null,
      });

      if (!email || !historyId) {
        devLog("gmail:webhook", "Skipping: missing email or historyId", {
          keys: Object.keys(decodedMessage),
        });
        return;
      }

      await db
        .insert(gmailWebhookEvents)
        .values({ email, historyId })
        .onConflictDoUpdate({
          target: gmailWebhookEvents.email,
          set: { historyId },
        });

      const linked = await db
        .select({ account: gmailAccounts })
        .from(gmailAccounts)
        .innerJoin(users, eq(users.id, gmailAccounts.userId))
        .where(eq(users.email, email))
        .limit(1);

      if (linked.length === 0) {
        devLog("gmail:webhook", "No gmail_accounts row for user email; webhook stored only", {
          email,
        });
        return;
      }

      await syncGmailHistoryFromNotification({
        account: linked[0].account,
        accountEmail: email,
        notificationHistoryId: historyId,
      });

      devLog("gmail:webhook", "Webhook processed (history sync)", {
        email,
        historyId,
      });
    } catch (error) {
      console.error("Failed to process gmail webhook:", error);
    }
  });

  return response;
};
