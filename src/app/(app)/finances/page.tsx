import type { Metadata } from "next";
import { FinancesContent } from "./finances-content";

export const metadata: Metadata = {
  title: "Finances",
};

export default function FinancesPage() {
  return <FinancesContent />;
}
