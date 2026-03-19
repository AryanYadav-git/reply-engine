import { pgTable, uuid, text, timestamp, boolean, jsonb } from "drizzle-orm/pg-core"

export const messages = pgTable("messages", {
  id: uuid("id").primaryKey().defaultRandom(),

  threadId: uuid("thread_id").notNull(),

  gmailMessageId: text("gmail_message_id").notNull(),

  from: text("from").notNull(),

  to: text("to").notNull(),

  subject: text("subject"),

  bodyText: text("body_text"),

  bodyHtml: text("body_html"),

  headers: jsonb("headers"),

  isInbound: boolean("is_inbound"),

  receivedAt: timestamp("received_at"),

  createdAt: timestamp("created_at").defaultNow()
})