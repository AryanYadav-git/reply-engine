import axios from "axios";

import { devLog } from "../lib/dev-log";

const WATCH_URL = "https://gmail.googleapis.com/gmail/v1/users/me/watch";

export type GmailWatchResult = {
  historyId?: string;
  expiration?: string;
};

/**
 * Subscribe this mailbox to Pub/Sub push notifications via Gmail watch.
 * @see https://developers.google.com/gmail/api/reference/rest/v1/users/watch
 */
export async function registerGmailPushWatch(
  accessToken: string
): Promise<GmailWatchResult> {
  const topicName = process.env.GMAIL_PUBSUB_TOPIC?.trim();
  if (!topicName) {
    throw new Error(
      "GMAIL_PUBSUB_TOPIC is not set (e.g. projects/my-project/topics/gmail-updates)"
    );
  }

  const labelIdsEnv = process.env.GMAIL_WATCH_LABEL_IDS?.trim();
  const labelIds = labelIdsEnv
    ? labelIdsEnv.split(",").map((s) => s.trim()).filter(Boolean)
    : ["INBOX"];

  devLog("gmail:watch", "Calling users/me/watch", {
    topicName,
    labelIds,
  });

  const res = await axios.post<GmailWatchResult>(
    WATCH_URL,
    {
      topicName,
      labelIds,
    },
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    }
  );

  const data = res.data ?? {};
  devLog("gmail:watch", "users/me/watch succeeded", {
    historyId: data.historyId ?? null,
    expiration: data.expiration ?? null,
  });

  return data;
}
