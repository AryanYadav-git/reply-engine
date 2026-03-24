import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
  uniqueIndex,
} from "drizzle-orm/pg-core";

import { gmailAccounts } from "./gmailAccounts";

/** Gmail thread (conversation) per linked account; `messages` attach via `thread_id`. */
export const threads = pgTable(
  "threads",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    gmailAccountId: integer("gmail_account_id")
      .notNull()
      .references(() => gmailAccounts.id, { onDelete: "cascade" }),

    gmailThreadId: text("gmail_thread_id").notNull(),

    subject: text("subject"),

    snippet: text("snippet"),

    lastMessageAt: timestamp("last_message_at"),

    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("threads_gmail_account_id_gmail_thread_id_unique").on(
      t.gmailAccountId,
      t.gmailThreadId
    ),
  ]
);
