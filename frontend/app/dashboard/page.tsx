import { Suspense } from "react";

import { DashboardClient } from "./dashboard-client";

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-zinc-50">
          <p className="text-sm text-muted-foreground">Loading…</p>
        </main>
      }
    >
      <DashboardClient />
    </Suspense>
  );
}
