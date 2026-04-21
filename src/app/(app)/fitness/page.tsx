import type { Metadata } from "next";
import { FitnessContent } from "./fitness-content";

export const metadata: Metadata = {
  title: "Fitness",
};

export default function FitnessPage() {
  return <FitnessContent />;
}
