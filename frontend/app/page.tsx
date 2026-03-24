import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center gap-8 bg-zinc-50 px-6 py-16 text-center">
      <div className="space-y-3">
        <p className="text-sm font-medium tracking-wide text-muted-foreground uppercase">
          Umbrella
        </p>
        <h1 className="font-heading text-balance text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          Modern auth, wired to your API
        </h1>
        <p className="text-pretty text-sm leading-relaxed text-muted-foreground sm:text-base">
          Sign up or sign in with email and password, or continue with Google
          OAuth—connected to your Hono backend.
        </p>
      </div>
      <Button size="lg" className="gap-2" asChild>
        <Link href="/auth">
          Open sign in
          <ArrowRight className="size-4" aria-hidden />
        </Link>
      </Button>
    </main>
  );
}
