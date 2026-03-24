import { pgTable, serial, varchar, timestamp } from "drizzle-orm/pg-core";

export const gmailWebhookEvents = pgTable("gmail_webhook_events", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  historyId: varchar("history_id", { length: 255 }).notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
