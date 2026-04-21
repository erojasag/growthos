"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Plus,
  Check,
  Flame,
  Target,
  Trash2,
  BookOpen,
  Droplets,
  Moon,
  Brain,
  Heart,
  Zap,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface Habit {
  id: string;
  name: string;
  icon: string;
  color: string;
  frequency: "daily" | "weekly";
  targetCount: number;
  completedDates: string[];
}

const iconMap: Record<string, LucideIcon> = {
  BookOpen,
  Droplets,
  Moon,
  Brain,
  Heart,
  Zap,
  Target,
};

const colorOptions = [
  { name: "Blue", value: "bg-blue-500" },
  { name: "Green", value: "bg-emerald-500" },
  { name: "Purple", value: "bg-purple-500" },
  { name: "Orange", value: "bg-orange-500" },
  { name: "Pink", value: "bg-pink-500" },
  { name: "Cyan", value: "bg-cyan-500" },
];

const today = new Date().toISOString().split("T")[0];

const getLast7Days = () => {
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push({
      date: d.toISOString().split("T")[0],
      label: d.toLocaleDateString("es", { weekday: "short" }),
      day: d.getDate(),
    });
  }
  return days;
};


function getStreak(dates: string[]): number {
  if (dates.length === 0) return 0;
  const sorted = [...new Set(dates)].sort(
    (a, b) => new Date(b).getTime() - new Date(a).getTime()
  );
  let streak = 0;
  const todayDate = new Date();
  todayDate.setHours(0, 0, 0, 0);

  for (let i = 0; i < sorted.length; i++) {
    const expected = new Date(todayDate);
    expected.setDate(expected.getDate() - i);
    const expStr = expected.toISOString().split("T")[0];
    if (sorted[i] === expStr) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

export function HabitsContent() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [newHabit, setNewHabit] = useState({
    name: "",
    icon: "Target",
    color: "bg-blue-500",
    frequency: "daily" as "daily" | "weekly",
  });

  const last7 = getLast7Days();

  const fetchHabits = useCallback(async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: habitsData } = await supabase
      .from("habits")
      .select("*")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .order("created_at");

    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

    const { data: entriesData } = await supabase
      .from("habit_entries")
      .select("*")
      .eq("user_id", user.id)
      .gte("completed_at", sixtyDaysAgo.toISOString().split("T")[0]);

    if (habitsData) {
      const mapped: Habit[] = habitsData.map((h) => ({
        id: h.id,
        name: h.name,
        icon: h.icon,
        color: h.color,
        frequency: h.frequency,
        targetCount: h.target_count,
        completedDates: (entriesData || [])
          .filter((e) => e.habit_id === h.id)
          .map((e) => e.completed_at),
      }));
      setHabits(mapped);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchHabits();
  }, [fetchHabits]);

  const todayCompleted = habits.filter((h) =>
    h.completedDates.includes(today)
  ).length;

  const completionRate = habits.length
    ? Math.round((todayCompleted / habits.length) * 100)
    : 0;

  const bestStreak = Math.max(
    ...habits.map((h) => getStreak(h.completedDates)),
    0
  );

  const toggleHabit = async (habitId: string, date: string) => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const habit = habits.find((h) => h.id === habitId);
    if (!habit) return;
    const hasDate = habit.completedDates.includes(date);

    setHabits(
      habits.map((h) => {
        if (h.id !== habitId) return h;
        return {
          ...h,
          completedDates: hasDate
            ? h.completedDates.filter((d) => d !== date)
            : [...h.completedDates, date],
        };
      })
    );

    if (hasDate) {
      await supabase
        .from("habit_entries")
        .delete()
        .eq("habit_id", habitId)
        .eq("completed_at", date);
    } else {
      await supabase.from("habit_entries").insert({
        habit_id: habitId,
        user_id: user.id,
        completed_at: date,
      });
    }
  };

  const handleAddHabit = async () => {
    if (!newHabit.name) return;
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("habits")
      .insert({
        user_id: user.id,
        name: newHabit.name,
        icon: newHabit.icon,
        color: newHabit.color,
        frequency: newHabit.frequency,
        target_count: 1,
      })
      .select()
      .single();

    if (data && !error) {
      setHabits([
        ...habits,
        {
          id: data.id,
          name: data.name,
          icon: data.icon,
          color: data.color,
          frequency: data.frequency,
          targetCount: data.target_count,
          completedDates: [],
        },
      ]);
    }

    setNewHabit({ name: "", icon: "Target", color: "bg-blue-500", frequency: "daily" });
    setShowDialog(false);
  };

  const handleDelete = async (id: string) => {
    const supabase = createClient();
    await supabase.from("habits").delete().eq("id", id);
    setHabits(habits.filter((h) => h.id !== id));
  };

  if (loading) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 flex items-center justify-center min-h-[400px]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-zinc-200 border-t-zinc-600 dark:border-zinc-700 dark:border-t-zinc-300" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Hábitos</h1>
          <p className="text-zinc-500 dark:text-zinc-400">
            Construye consistencia, rastrea tus rachas.
          </p>
        </div>
        <Button onClick={() => setShowDialog(true)}>
          <Plus className="h-4 w-4" />
          Nuevo Hábito
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-lg bg-purple-100 p-2.5 dark:bg-purple-900/30">
              <Target className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Progreso de Hoy
              </p>
              <p className="text-xl font-bold">
                {todayCompleted}/{habits.length}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-lg bg-emerald-100 p-2.5 dark:bg-emerald-900/30">
              <Check className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Tasa de Completado
              </p>
              <p className="text-xl font-bold">{completionRate}%</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-lg bg-orange-100 p-2.5 dark:bg-orange-900/30">
              <Flame className="h-5 w-5 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Mejor Racha
              </p>
              <p className="text-xl font-bold">{bestStreak} días</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Overall Progress */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Progreso de Hoy</CardTitle>
        </CardHeader>
        <CardContent>
          <Progress
            value={todayCompleted}
            max={habits.length || 1}
            className="h-3"
            indicatorClassName="bg-gradient-to-r from-purple-500 to-pink-500"
          />
          <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
            {todayCompleted} de {habits.length} hábitos completados hoy
          </p>
        </CardContent>
      </Card>

      {/* Habit Tracker Grid */}
      <Card>
        <CardHeader>
          <CardTitle>Seguimiento Semanal</CardTitle>
          <CardDescription>Haz clic para marcar como completado</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {/* Header row */}
            <div className="grid grid-cols-[1fr_repeat(7,40px)_60px] gap-2 items-center">
              <div className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                Hábito
              </div>
              {last7.map((d) => (
                <div
                  key={d.date}
                  className="text-center text-xs text-zinc-500 dark:text-zinc-400"
                >
                  <div>{d.label}</div>
                  <div className="font-medium">{d.day}</div>
                </div>
              ))}
              <div className="text-center text-xs text-zinc-500 dark:text-zinc-400">
                Racha
              </div>
            </div>

            {/* Habit rows */}
            {habits.map((habit) => {
              const Icon = iconMap[habit.icon] || Target;
              const streak = getStreak(habit.completedDates);

              return (
                <div
                  key={habit.id}
                  className="grid grid-cols-[1fr_repeat(7,40px)_60px] gap-2 items-center"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div
                      className={`shrink-0 rounded-md p-1.5 text-white ${habit.color}`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                    <span className="text-sm font-medium truncate">
                      {habit.name}
                    </span>
                    <button
                      onClick={() => handleDelete(habit.id)}
                      className="shrink-0 rounded p-0.5 text-zinc-300 hover:text-red-500 dark:text-zinc-600 dark:hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                  {last7.map((d) => {
                    const completed = habit.completedDates.includes(d.date);
                    return (
                      <button
                        key={d.date}
                        onClick={() => toggleHabit(habit.id, d.date)}
                        className={`mx-auto flex h-8 w-8 items-center justify-center rounded-lg border transition-all ${
                          completed
                            ? `${habit.color} border-transparent text-white shadow-sm`
                            : "border-zinc-200 bg-zinc-50 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-800"
                        }`}
                      >
                        {completed && <Check className="h-4 w-4" />}
                      </button>
                    );
                  })}
                  <div className="text-center">
                    {streak > 0 ? (
                      <Badge
                        variant="secondary"
                        className="text-xs gap-1"
                      >
                        <Flame className="h-3 w-3 text-orange-500" />
                        {streak}
                      </Badge>
                    ) : (
                      <span className="text-xs text-zinc-400">-</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Add Habit Dialog */}
      <Dialog open={showDialog} onClose={() => setShowDialog(false)}>
        <DialogHeader>
          <DialogTitle>Nuevo Hábito</DialogTitle>
        </DialogHeader>
        <div className="mt-4 space-y-4">
          <div>
            <label className="text-sm font-medium">Nombre del Hábito</label>
            <Input
              placeholder="Ej. Leer 30 minutos"
              value={newHabit.name}
              onChange={(e) =>
                setNewHabit({ ...newHabit, name: e.target.value })
              }
              className="mt-1"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Ícono</label>
            <Select
              value={newHabit.icon}
              onChange={(e) =>
                setNewHabit({ ...newHabit, icon: e.target.value })
              }
              className="mt-1"
            >
              {Object.keys(iconMap).map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium">Color</label>
            <div className="mt-2 flex gap-2">
              {colorOptions.map((c) => (
                <button
                  key={c.value}
                  onClick={() => setNewHabit({ ...newHabit, color: c.value })}
                  className={`h-8 w-8 rounded-full ${c.value} transition-all ${
                    newHabit.color === c.value
                      ? "ring-2 ring-offset-2 ring-zinc-400 dark:ring-offset-zinc-950"
                      : "opacity-60 hover:opacity-100"
                  }`}
                />
              ))}
            </div>
          </div>
          <div>
            <label className="text-sm font-medium">Frecuencia</label>
            <Select
              value={newHabit.frequency}
              onChange={(e) =>
                setNewHabit({
                  ...newHabit,
                  frequency: e.target.value as "daily" | "weekly",
                })
              }
              className="mt-1"
            >
              <option value="daily">Diario</option>
              <option value="weekly">Semanal</option>
            </Select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleAddHabit}>Crear Hábito</Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
