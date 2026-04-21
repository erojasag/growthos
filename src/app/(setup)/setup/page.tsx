import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SetupForm } from "./setup-form";

export default async function SetupPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: settings } = await supabase
    .from("user_settings")
    .select("setup_completed")
    .eq("user_id", user.id)
    .single();

  if (settings?.setup_completed) {
    redirect("/dashboard");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, email")
    .eq("id", user.id)
    .single();

  return (
    <SetupForm
      defaultName={profile?.full_name ?? ""}
      email={profile?.email ?? user.email ?? ""}
    />
  );
}
