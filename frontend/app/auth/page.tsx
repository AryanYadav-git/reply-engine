"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, Mail } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { BACKEND_URL, SESSION_TOKEN_KEY } from "@/lib/api";

type Mode = "signup" | "signin";

const oauthErrorMessages: Record<string, string> = {
  missing_code: "Sign-in was cancelled or incomplete.",
  token_exchange_failed: "Could not verify your Google sign-in. Try again.",
  no_access_token: "Google did not return an access token.",
  userinfo_failed: "Could not load your Google profile.",
  session_failed: "Could not start a session. Check server configuration (JWT_SECRET).",
  gmail_watch_failed:
    "Google sign-in worked, but Gmail Pub/Sub watch failed. Check GMAIL_PUBSUB_TOPIC, GCP permissions, and API logs.",
  gmail_account_save_failed:
    "Could not save Gmail tokens to the database. Run migrations and check DATABASE_URL.",
};

export default function AuthPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("signup");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [responseMessage, setResponseMessage] = useState("");
  const [isError, setIsError] = useState(false);

  const endpoint = useMemo(
    () => (mode === "signup" ? "/auth/signup" : "/auth/signin"),
    [mode]
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const err = params.get("error");
    if (!err) return;
    setResponseMessage(
      oauthErrorMessages[err] ?? "Something went wrong with Google sign-in."
    );
    setIsError(true);
    window.history.replaceState({}, "", "/auth");
  }, []);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setResponseMessage("");
    setIsError(false);

    try {
      const payload =
        mode === "signup"
          ? { name, email, password }
          : { email, password };

      const res = await fetch(`${BACKEND_URL}${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        setResponseMessage(data.error || "Authentication failed");
        setIsError(true);
        return;
      }

      if (typeof data.token === "string" && data.token.length > 0) {
        sessionStorage.setItem(SESSION_TOKEN_KEY, data.token);
        router.push("/dashboard");
        return;
      }

      setResponseMessage(data.message || "Success");
      setIsError(false);
    } catch {
      setResponseMessage("Could not connect to backend API");
      setIsError(true);
    } finally {
      setLoading(false);
    }
  };

  const onTabChange = (value: string) => {
    setMode(value as Mode);
    setResponseMessage("");
    setIsError(false);
  };

  const formFields = (showName: boolean, idPrefix: "signup" | "signin") => (
    <>
      {showName && (
        <div className="grid gap-2">
          <Label htmlFor={`${idPrefix}-name`}>Name</Label>
          <Input
            id={`${idPrefix}-name`}
            name="name"
            type="text"
            autoComplete="name"
            placeholder="Alex Morgan"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required={showName}
          />
        </div>
      )}
      <div className="grid gap-2">
        <Label htmlFor={`${idPrefix}-email`}>Email</Label>
        <Input
          id={`${idPrefix}-email`}
          name="email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor={`${idPrefix}-password`}>Password</Label>
        <Input
          id={`${idPrefix}-password`}
          name="password"
          type="password"
          autoComplete={showName ? "new-password" : "current-password"}
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </div>
      <Button type="submit" className="mt-2 w-full" size="lg" disabled={loading}>
        {loading ? (
          <>
            <Loader2 className="size-4 animate-spin" aria-hidden />
            Please wait…
          </>
        ) : showName ? (
          "Create account"
        ) : (
          "Sign in"
        )}
      </Button>
    </>
  );

  return (
    <div className="relative min-h-screen overflow-hidden bg-zinc-50">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,oklch(0.93_0.04_264),transparent)]"
        aria-hidden
      />
      <div className="relative mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-12 sm:px-6">
        <div className="mb-8 text-center">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <span className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
              <Mail className="size-4" aria-hidden />
            </span>
            Umbrella
          </Link>
        </div>

        <Card className="border-border/80 shadow-lg shadow-zinc-200/60 ring-zinc-200/80">
          <CardHeader className="space-y-1 pb-2 text-center sm:text-left">
            <CardTitle className="font-heading text-xl tracking-tight sm:text-2xl">
              Sign in or create an account
            </CardTitle>
            <CardDescription>
              Use your email and password, or continue with Google.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            <Tabs value={mode} onValueChange={onTabChange} className="w-full">
              <TabsList className="grid w-full grid-cols-2" variant="default">
                <TabsTrigger value="signup">Sign up</TabsTrigger>
                <TabsTrigger value="signin">Sign in</TabsTrigger>
              </TabsList>

              <TabsContent value="signup" className="mt-6 outline-none">
                <form onSubmit={onSubmit} className="space-y-4">
                  {formFields(true, "signup")}
                </form>
              </TabsContent>

              <TabsContent value="signin" className="mt-6 outline-none">
                <form onSubmit={onSubmit} className="space-y-4">
                  {formFields(false, "signin")}
                </form>
              </TabsContent>
            </Tabs>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <Separator className="w-full" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">
                  Or continue with
                </span>
              </div>
            </div>

            <Button variant="outline" className="w-full" size="lg" asChild>
              <a href={`${BACKEND_URL}/auth/google`}>
                <svg className="size-4 shrink-0" aria-hidden viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                Continue with Google
              </a>
            </Button>

            {responseMessage && (
              <p
                role="status"
                className={cn(
                  "rounded-lg border px-3 py-2.5 text-center text-sm",
                  isError
                    ? "border-destructive/30 bg-destructive/5 text-destructive"
                    : "border-emerald-200 bg-emerald-50 text-emerald-900"
                )}
              >
                {responseMessage}
              </p>
            )}
          </CardContent>

          <CardFooter className="flex justify-center border-t border-border/60 pt-6">
            <p className="text-center text-xs text-muted-foreground">
              By continuing you agree to our terms and privacy policy.
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
