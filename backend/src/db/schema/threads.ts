import { pgTable, uuid, text, timestamp } from "drizzle-orm/pg-core"

export const threads = pgTable("threads", {
  id: uuid("id").primaryKey().defaultRandom(),

  gmailAccountId: uuid("gmail_account_id").notNull(),

  gmailThreadId: text("gmail_thread_id").notNull(),

  subject: text("subject"),

  snippet: text("snippet"),

  lastMessageAt: timestamp("last_message_at"),

  createdAt: timestamp("created_at").defaultNow()
})