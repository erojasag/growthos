"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Dumbbell,
  Wallet,
  Target,
  Menu,
  X,
  Flame,
  LogOut,
  User,
} from "lucide-react";
import { useState, useEffect } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { logout } from "@/app/actions/auth";
import { ThemeToggle } from "@/components/theme-toggle";

const navigation = [
  { name: "Panel", href: "/dashboard", icon: LayoutDashboard },
  { name: "Fitness", href: "/fitness", icon: Dumbbell },
  { name: "Finanzas", href: "/finances", icon: Wallet },
  { name: "Hábitos", href: "/habits", icon: Target },
];

export function Sidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userAvatar, setUserAvatar] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUserEmail(user?.email ?? null);
      setUserAvatar(user?.user_metadata?.avatar_url ?? null);
      setUserName(user?.user_metadata?.full_name ?? user?.user_metadata?.name ?? null);
    });
  }, []);

  return (
    <>
      {/* Mobile header */}
      <div className="sticky top-0 z-40 flex h-14 items-center gap-4 border-b border-zinc-200 bg-white px-4 dark:border-zinc-800 dark:bg-zinc-950 lg:hidden">
        <button
          onClick={() => setMobileOpen(true)}
          className="text-zinc-700 dark:text-zinc-300"
        >
          <Menu className="h-6 w-6" />
        </button>
        <div className="flex items-center gap-2">
          <Flame className="h-6 w-6 text-orange-500" />
          <span className="text-lg font-bold">GrowthOS</span>
        </div>
      </div>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="fixed inset-0 bg-black/50"
            onClick={() => setMobileOpen(false)}
          />
          <div className="fixed inset-y-0 left-0 w-72 bg-white dark:bg-zinc-950">
            <div className="flex h-14 items-center justify-between px-6">
              <div className="flex items-center gap-2">
                <Flame className="h-6 w-6 text-orange-500" />
                <span className="text-lg font-bold">GrowthOS</span>
              </div>
              <button onClick={() => setMobileOpen(false)}>
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="flex flex-col gap-1 px-3 py-4">
              {navigation.map((item) => {
                const isActive = pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-50"
                        : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-50"
                    )}
                  >
                    <item.icon className="h-5 w-5" />
                    {item.name}
                  </Link>
                );
              })}
            </nav>
            <div className="mt-auto border-t border-zinc-200 px-3 pt-4 pb-4 dark:border-zinc-800">
              <ThemeToggle />
            </div>
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
        <div className="flex grow flex-col gap-y-5 overflow-y-auto border-r border-zinc-200 bg-white px-6 pb-4 dark:border-zinc-800 dark:bg-zinc-950">
          <div className="flex h-16 shrink-0 items-center gap-2">
            <Flame className="h-7 w-7 text-orange-500" />
            <span className="text-xl font-bold tracking-tight">GrowthOS</span>
          </div>
          <nav className="flex flex-1 flex-col gap-1">
            {navigation.map((item) => {
              const isActive = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-50"
                      : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-50"
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  {item.name}
                </Link>
              );
            })}
          </nav>
          <div className="mt-auto space-y-3 border-t border-zinc-200 pt-4 dark:border-zinc-800">
            <ThemeToggle />
            {userEmail && (
              <div className="flex items-center gap-2 px-1">
                {userAvatar ? (
                  <Image
                    src={userAvatar}
                    alt={userName ?? "Avatar"}
                    width={32}
                    height={32}
                    className="h-8 w-8 shrink-0 rounded-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800">
                    <User className="h-4 w-4 text-zinc-500" />
                  </div>
                )}
                <div className="min-w-0">
                  {userName && (
                    <p className="truncate text-xs font-medium text-zinc-700 dark:text-zinc-300">
                      {userName}
                    </p>
                  )}
                  <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">
                    {userEmail}
                  </p>
                </div>
              </div>
            )}
            <form action={logout}>
              <button
                type="submit"
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-50"
              >
                <LogOut className="h-4 w-4" />
                Cerrar Sesión
              </button>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}
