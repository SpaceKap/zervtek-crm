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
      <div className="container mx-auto px-4 py-8 sm:px-6 lg:px-8 max-w-2xl">
        <Link
          href="/"
          className={cn(buttonVariants({ variant: "ghost" }), "mb-4")}
        >
          <ArrowLeft className="mr-2 size-4" />
          Back to portal
        </Link>
        <Card>
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
