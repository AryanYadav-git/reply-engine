To install dependencies:
```sh
bun install
```

To run:
```sh
bun run dev
```

After pulling schema changes, apply SQL migrations (adds columns like `threads.updated_at`):

```sh
bun run db:migrate
```

open http://localhost:3000

## Auth / Google OAuth

- **`GOOGLE_REDIRECT_URI`** must point at this server (e.g. `http://localhost:3000/auth/google/callback`), not the Next.js app. Google sends the `code` here so the backend can exchange it using **`GOOGLE_CLIENT_SECRET`**.
- **`FRONTEND_URL`** is where users are sent after Google login (e.g. `http://localhost:3001`).
- **`JWT_SECRET`** signs session tokens returned to the browser (use a long random string).

Copy `.env.example` to `.env` and fill in values.

### Development logging

Structured `console.log` lines prefixed with `[umbrella:dev][scope]` run when **`NODE_ENV` is not `production`**. Set **`DEV_LOGGING=0`** to turn them off locally.

### Gmail `users/me/watch` (Pub/Sub)

After Google OAuth, the API calls [`users.watch`](https://developers.google.com/gmail/api/reference/rest/v1/users/watch) when **`GMAIL_PUBSUB_TOPIC`** is set (full name: `projects/PROJECT_ID/topics/TOPIC_NAME`). Grant the topic **publish** to Google’s push service account **`gmail-api-push@system.gserviceaccount.com`**. Optional **`GMAIL_WATCH_LABEL_IDS`** overrides the default `INBOX` label list.
