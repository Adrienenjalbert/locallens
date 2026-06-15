import type { Metadata } from "next";
import { PricingView } from "@/views/PricingView";

export const metadata: Metadata = {
  title: "Pricing — start free, upgrade to win more work | LocalLens",
  description:
    "Simple, honest pricing for local businesses. Start free and see every lead waiting for you. Upgrade to reply instantly, automate follow-ups, send invoices and get more booked jobs.",
};

export default function PricingPage() {
  return <PricingView />;
}
