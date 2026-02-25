import Link from "next/link";
import { getServerSession } from "next-auth";
import { Car } from "lucide-react";
import { authOptions } from "@/lib/auth";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { redirect } from "next/navigation";
import { PortalDashboard } from "./portal-dashboard";
import { cn } from "@/lib/utils";

export default async function HomePage() {
  const session = await getServerSession(authOptions);

  if (session?.user?.id) {
    return <PortalDashboard customerId={session.user.id} />;
  }

  return (
    <div className="flex min-h-screen min-h-[100dvh] flex-col items-center justify-center bg-muted p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
      <Card className="w-full max-w-md bg-white shadow-md dark:bg-zinc-900">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-primary/10">
            <Car className="size-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">Customer Portal</CardTitle>
          <CardDescription>
            Log in to view your vehicles, shipping status, documents and
            invoices.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 text-center">
          <Link
            href="/login"
            className={cn(buttonVariants(), "w-full min-h-[44px] sm:min-h-0")}
          >
            Log in
          </Link>
          <Link
            href="/register"
            className={cn(buttonVariants({ variant: "outline" }), "w-full min-h-[44px] sm:min-h-0")}
          >
            Create an account
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
