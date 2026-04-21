import { redirect } from "next/navigation";
import { Sidebar } from "@/components/sidebar";
import { createClient } from "@/lib/supabase/server";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    const { data: settings } = await supabase
      .from("user_settings")
      .select("setup_completed")
      .eq("user_id", user.id)
      .single();

    if (!settings?.setup_completed) {
      redirect("/setup");
    }
  }

  return (
    <div className="h-full">
      <Sidebar />
      <div className="lg:pl-64">
        <main className="min-h-screen">
          {children}
        </main>
      </div>
    </div>
  );
}
