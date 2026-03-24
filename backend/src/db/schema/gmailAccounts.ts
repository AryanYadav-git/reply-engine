import {
  pgTable,
  serial,
  varchar,
  timestamp,
  text,
  bigint,
  integer,
} from "drizzle-orm/pg-core";
import { users } from "./user";

export const gmailAccounts = pgTable("gmail_accounts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: "cascade" }),
  accessToken: text("access_token").notNull(),
  refreshToken: text("refresh_token").notNull(),
  tokenExpiry: timestamp("token_expiry"),
  historyId: varchar("history_id", { length: 255 }),
  watchExpiration: bigint("watch_expiration", { mode: "number" }),

  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});