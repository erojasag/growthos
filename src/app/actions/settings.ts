"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const ALLOWED_CURRENCIES = ["CRC", "USD"];

export async function completeSetup(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const monthlyIncome = Math.max(0, Math.min(Number(formData.get("monthlyIncome")) || 0, 999_999_999));
  const incomeCurrency = ALLOWED_CURRENCIES.includes(formData.get("incomeCurrency") as string)
    ? (formData.get("incomeCurrency") as string) : "CRC";
  const spendingCurrency = ALLOWED_CURRENCIES.includes(formData.get("spendingCurrency") as string)
    ? (formData.get("spendingCurrency") as string) : "CRC";
  const fullName = (formData.get("fullName") as string)?.trim().slice(0, 100);

  if (fullName) {
    await supabase
      .from("profiles")
      .update({ full_name: fullName })
      .eq("id", user.id);
  }

  const { error } = await supabase.from("user_settings").upsert(
    {
      user_id: user.id,
      monthly_income: monthlyIncome,
      income_currency: incomeCurrency,
      spending_currency: spendingCurrency,
      income_updated_at: new Date().toISOString(),
      setup_completed: true,
    },
    { onConflict: "user_id" }
  );

  if (error) {
    return { error: error.message };
  }

  redirect("/dashboard");
}

export async function updateMonthlyIncome(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: settings } = await supabase
    .from("user_settings")
    .select("income_updated_at")
    .eq("user_id", user.id)
    .single();

  if (settings) {
    const updated = new Date(settings.income_updated_at);
    const nextAllowed = new Date(updated);
    nextAllowed.setDate(nextAllowed.getDate() + 30);
    if (new Date() < nextAllowed) {
      const daysLeft = Math.ceil(
        (nextAllowed.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );
      return { error: `You can change your income in ${daysLeft} days` };
    }
  }

  const monthlyIncome = Math.max(0, Math.min(Number(formData.get("monthlyIncome")) || 0, 999_999_999));
  const rawCurrency = formData.get("incomeCurrency") as string;
  const incomeCurrency = ALLOWED_CURRENCIES.includes(rawCurrency) ? rawCurrency : undefined;

  const { error } = await supabase
    .from("user_settings")
    .update({
      monthly_income: monthlyIncome,
      income_updated_at: new Date().toISOString(),
      ...(incomeCurrency ? { income_currency: incomeCurrency } : {}),
    })
    .eq("user_id", user.id);

  if (error) return { error: error.message };
  return { success: true };
}

export async function updateCurrencyPreferences(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const spendingCurrency = ALLOWED_CURRENCIES.includes(formData.get("spendingCurrency") as string)
    ? (formData.get("spendingCurrency") as string) : "CRC";
  const incomeCurrency = ALLOWED_CURRENCIES.includes(formData.get("incomeCurrency") as string)
    ? (formData.get("incomeCurrency") as string) : "CRC";

  const { error } = await supabase
    .from("user_settings")
    .update({
      spending_currency: spendingCurrency,
      income_currency: incomeCurrency,
    })
    .eq("user_id", user.id);

  if (error) return { error: error.message };
  return { success: true };
}
