import {
  pgTable,
  uuid,
  text,
  timestamp,
  boolean,
  jsonb,
  uniqueIndex,
} from "drizzle-orm/pg-core";

import { threads } from "./threads";

export const messages = pgTable(
  "messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    threadId: uuid("thread_id")
      .notNull()
      .references(() => threads.id, { onDelete: "cascade" }),

    gmailMessageId: text("gmail_message_id").notNull(),

    from: text("from").notNull(),

    to: text("to").notNull(),

    subject: text("subject"),

    bodyText: text("body_text"),

    bodyHtml: text("body_html"),

    headers: jsonb("headers"),

    isInbound: boolean("is_inbound"),

    receivedAt: timestamp("received_at"),

    createdAt: timestamp("created_at").defaultNow(),
  },
  (t) => [
    uniqueIndex("messages_thread_id_gmail_message_id_unique").on(
      t.threadId,
      t.gmailMessageId
    ),
  ]
);
