"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { LogOut, User } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { BACKEND_URL, SESSION_TOKEN_KEY } from "@/lib/api";

type UserRow = {
  id: number;
  email: string;
  name: string;
  createdAt: string | null;
};

export function DashboardClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [user, setUser] = useState<UserRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadUser = useCallback(async (token: string) => {
    const res = await fetch(`${BACKEND_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      sessionStorage.removeItem(SESSION_TOKEN_KEY);
      setError((data as { error?: string }).error || "Session expired");
      setUser(null);
      return;
    }
    setUser((data as { user: UserRow }).user);
    setError(null);
  }, []);

  useEffect(() => {
    let cancelled = false;

    queueMicrotask(() => {
      if (cancelled) return;

      let token = sessionStorage.getItem(SESSION_TOKEN_KEY);
      const fromUrl = searchParams.get("token");
      if (fromUrl) {
        token = fromUrl;
        sessionStorage.setItem(SESSION_TOKEN_KEY, fromUrl);
        router.replace("/dashboard", { scroll: false });
      }

      if (!token) {
        setLoading(false);
        setError("Not signed in");
        return;
      }

      void loadUser(token).finally(() => {
        if (!cancelled) setLoading(false);
      });
    });

    return () => {
      cancelled = true;
    };
  }, [searchParams, router, loadUser]);

  const signOut = () => {
    sessionStorage.removeItem(SESSION_TOKEN_KEY);
    router.push("/auth");
  };

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-50">
        <p className="text-sm text-muted-foreground">Loading your account…</p>
      </main>
    );
  }

  if (error || !user) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-zinc-50 px-4">
        <p className="text-center text-sm text-destructive">{error}</p>
        <Button asChild>
          <Link href="/auth">Back to sign in</Link>
        </Button>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-50 px-4 py-12">
      <div className="mx-auto max-w-lg space-y-6">
        <div className="flex items-center justify-between gap-4">
          <Link
            href="/"
            className="text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            ← Home
          </Link>
          <Button variant="outline" size="sm" onClick={signOut} className="gap-2">
            <LogOut className="size-4" aria-hidden />
            Sign out
          </Button>
        </div>

        <Card className="border-border/80 shadow-lg shadow-zinc-200/60">
          <CardHeader>
            <div className="flex size-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <User className="size-6" aria-hidden />
            </div>
            <CardTitle className="font-heading text-2xl tracking-tight">
              {user.name}
            </CardTitle>
            <CardDescription>Signed in to Umbrella</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="rounded-lg border border-border/60 bg-muted/30 px-4 py-3">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Email
              </p>
              <p className="mt-1 font-medium text-foreground">{user.email}</p>
            </div>
            <div className="rounded-lg border border-border/60 bg-muted/30 px-4 py-3">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                User ID
              </p>
              <p className="mt-1 font-mono text-foreground">{user.id}</p>
            </div>
            {user.createdAt && (
              <div className="rounded-lg border border-border/60 bg-muted/30 px-4 py-3">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Member since
                </p>
                <p className="mt-1 text-foreground">
                  {new Date(user.createdAt).toLocaleString()}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
