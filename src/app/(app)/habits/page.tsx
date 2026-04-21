import type { Metadata } from "next";
import { HabitsContent } from "./habits-content";

export const metadata: Metadata = {
  title: "Habits",
};

export default function HabitsPage() {
  return <HabitsContent />;
}
