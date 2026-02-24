import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ProfileForm } from "./profile-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ArrowLeft } from "lucide-react";

export default async function ProfilePage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="container mx-auto max-w-2xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <Link
          href="/"
          className={cn(buttonVariants({ variant: "ghost" }), "mb-4 inline-flex min-h-[44px] items-center sm:min-h-0")}
        >
          <ArrowLeft className="mr-2 size-4 shrink-0" />
          Back to portal
        </Link>
        <Card className="min-w-0 overflow-hidden">
          <CardHeader>
            <CardTitle>My profile</CardTitle>
            <CardDescription>
              Update your details. This information is used for invoicing.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ProfileForm />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
