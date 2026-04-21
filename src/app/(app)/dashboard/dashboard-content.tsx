"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Dumbbell,
  Wallet,
  Target,
  TrendingUp,
  Flame,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency } from "@/lib/utils";

interface DashboardData {
  workoutsThisWeek: number;
  workoutsDelta: number;
  monthlySpending: number;
  spendingDelta: number;
  habitsCompleted: number;
  habitsTotal: number;
  currentStreak: number;
  bestStreak: number;
  weeklyData: { day: string; workouts: number; habits: number }[];
  recentActivity: { title: string; detail: string; time: string; icon: LucideIcon; color: string }[];
  spendingCurrency: string;
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function getStreak(dates: string[]): number {
  if (!dates.length) return 0;
  const sorted = [...new Set(dates)].sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
  let streak = 0;
  const todayDate = new Date();
  todayDate.setHours(0, 0, 0, 0);
  for (let i = 0; i < sorted.length; i++) {
    const expected = new Date(todayDate);
    expected.setDate(expected.getDate() - i);
    if (sorted[i] === expected.toISOString().split("T")[0]) streak++;
    else break;
  }
  return streak;
}

export function DashboardContent() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchDashboard = useCallback(async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    const startOfLastWeek = new Date(startOfWeek);
    startOfLastWeek.setDate(startOfLastWeek.getDate() - 7);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    const { data: settingsData } = await supabase
      .from("user_settings")
      .select("spending_currency")
      .eq("user_id", user.id)
      .single();
    const spendingCurrency = settingsData?.spending_currency ?? "CRC";

    const [workoutsRes, lastWeekWorkoutsRes, txRes, lastMonthTxRes, habitsRes, entriesRes, recentWorkoutsRes, recentTxRes] = await Promise.all([
      supabase.from("workouts").select("id, completed_at").eq("user_id", user.id).gte("completed_at", startOfWeek.toISOString()),
      supabase.from("workouts").select("id").eq("user_id", user.id).gte("completed_at", startOfLastWeek.toISOString()).lt("completed_at", startOfWeek.toISOString()),
      supabase.from("transactions").select("amount, type").eq("user_id", user.id).eq("type", "expense").gte("date", startOfMonth.toISOString().split("T")[0]),
      supabase.from("transactions").select("amount").eq("user_id", user.id).eq("type", "expense").gte("date", startOfLastMonth.toISOString().split("T")[0]).lte("date", endOfLastMonth.toISOString().split("T")[0]),
      supabase.from("habits").select("id").eq("user_id", user.id).eq("is_active", true),
      supabase.from("habit_entries").select("habit_id, completed_at").eq("user_id", user.id).gte("completed_at", new Date(Date.now() - 60 * 86400000).toISOString().split("T")[0]),
      supabase.from("workouts").select("name, duration_minutes, completed_at").eq("user_id", user.id).order("completed_at", { ascending: false }).limit(3),
      supabase.from("transactions").select("description, amount, type, created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(3),
    ]);

    const workoutsThisWeek = workoutsRes.data?.length ?? 0;
    const workoutsLastWeek = lastWeekWorkoutsRes.data?.length ?? 0;
    const monthlySpending = (txRes.data || []).reduce((s, t) => s + Number(t.amount), 0);
    const lastMonthSpending = (lastMonthTxRes.data || []).reduce((s, t) => s + Number(t.amount), 0);
    const spendingDelta = lastMonthSpending > 0 ? Math.round(((monthlySpending - lastMonthSpending) / lastMonthSpending) * 100) : 0;

    const today = new Date().toISOString().split("T")[0];
    const todayEntries = (entriesRes.data || []).filter((e) => e.completed_at === today);
    const habitsTotal = habitsRes.data?.length ?? 0;
    const habitsCompleted = todayEntries.length;

    const allDates = (entriesRes.data || []).map((e) => e.completed_at);
    const currentStreak = getStreak(allDates);

    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const weeklyData = days.map((day, i) => {
      const d = new Date(startOfWeek);
      d.setDate(d.getDate() + i);
      const dateStr = d.toISOString().split("T")[0];
      return {
        day,
        workouts: (workoutsRes.data || []).filter((w) => w.completed_at.split("T")[0] === dateStr).length,
        habits: (entriesRes.data || []).filter((e) => e.completed_at === dateStr).length,
      };
    });

    const recentActivity: DashboardData["recentActivity"] = [];
    (recentWorkoutsRes.data || []).forEach((w) => {
      recentActivity.push({
        title: w.name,
        detail: `${w.duration_minutes ?? 0} min`,
        time: timeAgo(w.completed_at),
        icon: Dumbbell,
        color: "text-blue-500",
      });
    });
    (recentTxRes.data || []).forEach((t) => {
      recentActivity.push({
        title: t.description || t.type,
        detail: `${t.type === "expense" ? "-" : "+"}${formatCurrency(Number(t.amount), spendingCurrency)}`,
        time: timeAgo(t.created_at),
        icon: Wallet,
        color: t.type === "expense" ? "text-red-500" : "text-emerald-500",
      });
    });
    recentActivity.sort((a, b) => {
      const parseTime = (s: string) => {
        const n = parseInt(s);
        if (s.includes("m")) return n;
        if (s.includes("h")) return n * 60;
        return n * 1440;
      };
      return parseTime(a.time) - parseTime(b.time);
    });

    setData({
      workoutsThisWeek,
      workoutsDelta: workoutsThisWeek - workoutsLastWeek,
      monthlySpending,
      spendingDelta,
      habitsCompleted,
      habitsTotal,
      currentStreak,
      bestStreak: currentStreak,
      weeklyData,
      recentActivity: recentActivity.slice(0, 5),
      spendingCurrency,
    });
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  if (loading || !data) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 flex items-center justify-center min-h-[400px]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-zinc-200 border-t-zinc-600 dark:border-zinc-700 dark:border-t-zinc-300" />
      </div>
    );
  }

  const completionPct = data.habitsTotal > 0 ? Math.round((data.habitsCompleted / data.habitsTotal) * 100) : 0;

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-zinc-500 dark:text-zinc-400">
          Your personal growth at a glance.
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Link href="/fitness">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                Workouts This Week
              </CardTitle>
              <Dumbbell className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data.workoutsThisWeek}</div>
              <div className={`flex items-center gap-1 text-xs ${data.workoutsDelta >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                {data.workoutsDelta >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                {data.workoutsDelta >= 0 ? "+" : ""}{data.workoutsDelta} from last week
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/finances">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                Monthly Spending
              </CardTitle>
              <Wallet className="h-4 w-4 text-emerald-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(data.monthlySpending, data.spendingCurrency)}</div>
              <div className={`flex items-center gap-1 text-xs ${data.spendingDelta <= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                {data.spendingDelta > 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                {data.spendingDelta > 0 ? "+" : ""}{data.spendingDelta}% from last month
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/habits">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                Habits Completed
              </CardTitle>
              <Target className="h-4 w-4 text-purple-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data.habitsCompleted}/{data.habitsTotal}</div>
              <Progress
                value={completionPct}
                className="mt-2"
                indicatorClassName="bg-purple-500"
              />
            </CardContent>
          </Card>
        </Link>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
              Current Streak
            </CardTitle>
            <Flame className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.currentStreak} days</div>
            <div className="flex items-center gap-1 text-xs text-orange-600 dark:text-orange-400">
              <TrendingUp className="h-3 w-3" />
              Best: {data.bestStreak} days
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts + Activity */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Weekly Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.weeklyData}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    className="stroke-zinc-200 dark:stroke-zinc-800"
                  />
                  <XAxis
                    dataKey="day"
                    className="text-xs"
                    tick={{ fill: "#a1a1aa" }}
                  />
                  <YAxis className="text-xs" tick={{ fill: "#a1a1aa" }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "var(--background)",
                      border: "1px solid #e4e4e7",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="habits"
                    stackId="1"
                    stroke="#a855f7"
                    fill="#a855f7"
                    fillOpacity={0.2}
                    name="Habits"
                  />
                  <Area
                    type="monotone"
                    dataKey="workouts"
                    stackId="2"
                    stroke="#3b82f6"
                    fill="#3b82f6"
                    fillOpacity={0.2}
                    name="Workouts"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.recentActivity.length === 0 ? (
                <p className="text-sm text-zinc-400 dark:text-zinc-500">No recent activity yet.</p>
              ) : data.recentActivity.map((item, i) => {
                const Icon = item.icon;
                return (
                  <div key={i} className="flex items-start gap-3">
                    <div
                      className={`mt-0.5 rounded-lg bg-zinc-100 p-2 dark:bg-zinc-800 ${item.color}`}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{item.title}</p>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">
                        {item.detail}
                      </p>
                    </div>
                    <Badge variant="secondary" className="shrink-0 text-[10px]">
                      {item.time}
                    </Badge>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
