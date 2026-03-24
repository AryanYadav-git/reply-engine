import "dotenv/config";

import db from "../index";
import { gmailWebhookEvents } from "../schema/gmailWebhookEvents";

async function main() {
  const deleted = await db.delete(gmailWebhookEvents).returning({ id: gmailWebhookEvents.id });
  console.log(
    `[seed] cleared gmail_webhook_events: removed ${deleted.length} row(s)`
  );
}

main()
  .catch((error) => {
    console.error("[seed] failed to clear gmail_webhook_events", error);
    process.exit(1);
  })
  .finally(() => {
    process.exit(0);
  });
