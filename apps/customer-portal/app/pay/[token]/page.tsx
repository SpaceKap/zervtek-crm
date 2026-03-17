import { notFound } from "next/navigation";
import { PayDepositClient } from "./pay-deposit-client";

const MAIN_APP_URL =
  process.env.NEXT_PUBLIC_MAIN_APP_URL ||
  process.env.NEXT_PUBLIC_CRM_URL ||
  "https://crm.zervtek.com";

export default async function PayDepositPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  if (!token) notFound();

  return (
    <div className="min-h-screen min-h-[100dvh] flex flex-col items-center justify-center bg-muted p-4">
      <PayDepositClient token={token} apiBase={MAIN_APP_URL.replace(/\/$/, "")} />
    </div>
  );
}
