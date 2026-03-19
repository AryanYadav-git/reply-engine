import { pgTable, uuid, text, boolean, timestamp } from "drizzle-orm/pg-core"

export const drafts = pgTable("drafts", {
  id: uuid("id").primaryKey().defaultRandom(),

  threadId: uuid("thread_id").notNull(),

  content: text("content").notNull(),

  aiGenerated: boolean("ai_generated").default(true),

  approved: boolean("approved").default(false),

  sent: boolean("sent").default(false),

  createdAt: timestamp("created_at").defaultNow()
})