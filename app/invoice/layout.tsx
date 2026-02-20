import { InvoiceLightTheme } from "@/components/InvoiceLightTheme";

export default function InvoiceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <InvoiceLightTheme>{children}</InvoiceLightTheme>;
}
