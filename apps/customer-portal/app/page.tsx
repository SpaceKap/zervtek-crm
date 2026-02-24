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
    <div className="min-h-screen bg-muted/30 flex flex-col items-center justify-center p-4">
      <Card className="w-full max-w-md">
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
            className={cn(buttonVariants(), "w-full")}
          >
            Log in
          </Link>
          <Link
            href="/register"
            className={cn(buttonVariants({ variant: "outline" }), "w-full")}
          >
            Create an account
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
