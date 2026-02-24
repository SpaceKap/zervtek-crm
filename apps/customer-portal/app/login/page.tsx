"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Car } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const registered = searchParams.get("registered");
  const verified = searchParams.get("verified");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const form = e.currentTarget;
    const formData = new FormData(form);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (res?.error) {
      setError(
        "Invalid email or password. If you just signed up, verify your email first."
      );
      setLoading(false);
      return;
    }
    if (res?.ok) {
      router.push("/");
      router.refresh();
    }
    setLoading(false);
  }

  return (
    <Card className="w-full max-w-md max-w-[calc(100vw-2rem)]">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-primary/10">
            <Car className="size-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">Log in</CardTitle>
          <CardDescription>
            Use your email and password to access your portal
          </CardDescription>
          {registered === "1" && (
            <p className="rounded-md bg-primary/10 px-3 py-2 text-sm text-primary">
              Account created. Please check your email to verify your address before signing in.
            </p>
          )}
          {verified === "1" && (
            <p className="rounded-md bg-primary/10 px-3 py-2 text-sm text-primary">
              Email verified. You can log in now.
            </p>
          )}
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {error && (
              <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </p>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                required
                placeholder="you@example.com"
                autoComplete="email"
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <Link
                  href="/forgot-password"
                  className="text-sm text-primary underline-offset-4 hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
              <Input
                id="password"
                name="password"
                type="password"
                required
                placeholder="Your password"
                autoComplete="current-password"
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Signing in…" : "Log in"}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              Don&apos;t have an account?{" "}
              <Link href="/register" className="text-primary underline-offset-4 hover:underline">
                Register
              </Link>
              {" · "}
              <Link href="/resend-verification" className="text-primary underline-offset-4 hover:underline">
                Resend verification email
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
  );
}

export default function LoginPage() {
  return (
    <div className="flex min-h-screen min-h-[100dvh] flex-col items-center justify-center bg-muted/30 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
      <Suspense fallback={<div className="w-full max-w-md rounded-xl border bg-card p-8 text-center text-muted-foreground">Loading…</div>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
