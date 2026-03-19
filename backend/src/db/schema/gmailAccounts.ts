
import {pgTable, serial, varchar, timestamp, uuid, bigint} from "drizzle-orm/pg-core";

export const gmailAccounts = pgTable('gmail_accounts', {
    id: serial('id').primaryKey(),
    userId: uuid('user_id').notNull(),
    accessToken: varchar('access_token', {length: 255}).notNull(),
    refreshToken: varchar('refresh_token', {length: 255}).notNull(),
    tokenExpiry: timestamp("token_expiry"),
    historyId: varchar("history_id", {length: 255}),
    watchExpiration: bigint("watch_expiration", {mode: "number"}),

    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
})