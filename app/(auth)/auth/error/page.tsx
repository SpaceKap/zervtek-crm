"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ThemeToggle } from "@/components/ThemeToggle";

function AuthErrorContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");
  const isAccessDenied = error === "AccessDenied";

  return (
    <Card className="w-full max-w-lg dark:bg-[#1E1E1E] dark:border-[#2C2C2C]">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold">
          {isAccessDenied ? "This Google account can’t access the CRM" : "Sign-in problem"}
        </CardTitle>
        <CardDescription>
          {isAccessDenied
            ? "Google signed you in, but this email is not allowed to use this CRM yet."
            : error
              ? `Error code: ${error}`
              : "Something went wrong while signing in."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isAccessDenied && (
          <div className="space-y-3 text-sm text-gray-600 dark:text-[#A1A1A1]">
            <p className="font-medium text-gray-900 dark:text-white">
              What this usually means
            </p>
            <ul className="list-disc space-y-2 pl-5 leading-relaxed">
              <li>
                <strong>Email not in the CRM.</strong> An admin must create your user
                with the <strong>exact</strong> Google email you use (same address
                Google shows after you pick an account).
              </li>
              <li>
                <strong>Wrong Google account on your phone.</strong> The CRM does
                not use “the account already on the device” by itself—you must
                complete sign-in with the Google account that matches your CRM user.
                Tap sign in again and <strong>choose the correct email</strong> when
                Google shows the account list.
              </li>
              <li>
                <strong>That email isn’t on the phone yet.</strong> On Android:{" "}
                <strong>Settings → Google → Add account</strong>, add the work
                Google account, then try CRM sign-in again and select it.
              </li>
              <li>
                If the list never appears, try{" "}
                <strong>Chrome → site settings for crm.zervtek.com → Clear data</strong>
                , or sign in once in an <strong>Incognito</strong> tab to force
                Google to ask which account to use.
              </li>
            </ul>
          </div>
        )}
        <Button asChild className="w-full" size="lg">
          <Link href="/login">Back to sign in</Link>
        </Button>
      </CardContent>
    </Card>
  );
}

export default function AuthErrorPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-[#121212] px-4 py-8">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <Suspense
        fallback={
          <Card className="w-full max-w-lg dark:bg-[#1E1E1E] dark:border-[#2C2C2C] p-8">
            <p className="text-sm text-muted-foreground">Loading…</p>
          </Card>
        }
      >
        <AuthErrorContent />
      </Suspense>
    </div>
  );
}
