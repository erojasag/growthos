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
import { Dialog, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Plus,
  Dumbbell,
  Timer,
  Flame as FlameIcon,
  TrendingUp,
  Trash2,
  Zap,
  CalendarDays,
  X,
  Scale,
  Trophy,
  Pencil,
  Loader2,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { createClient } from "@/lib/supabase/client";

interface Workout {
  id: string;
  name: string;
  type: string;
  duration: number;
  calories: number;
  date: string;
  exercises: { name: string; sets: number; reps: number; weight: number }[];
}

const tagOptions = ["Pecho", "Espalda", "Hombros", "Bíceps", "Tríceps", "Piernas", "Core", "Cardio", "HIIT", "Yoga"];
const noExerciseTags = new Set(["Cardio", "HIIT", "Yoga"]);

const muscleGroups: Record<string, string[]> = {
  "Pecho": ["Press de Banca", "Press Inclinado", "Aperturas", "Fondos", "Press con Mancuernas", "Pullover"],
  "Espalda": ["Jalón al Pecho", "Remo con Barra", "Remo con Mancuerna", "Peso Muerto", "Dominadas", "Remo en Máquina"],
  "Hombros": ["Press Militar", "Elevaciones Laterales", "Elevaciones Frontales", "Pájaros", "Press Arnold", "Face Pull"],
  "Bíceps": ["Curl con Barra", "Curl con Mancuernas", "Curl Martillo", "Curl Concentrado", "Curl en Polea"],
  "Tríceps": ["Extensión de Tríceps", "Press Francés", "Fondos en Paralelas", "Patada de Tríceps", "Extensión en Polea"],
  "Piernas": ["Sentadilla", "Prensa de Piernas", "Extensión de Cuádriceps", "Curl de Piernas", "Zancadas", "Hip Thrust", "Elevación de Talones"],
  "Core": ["Plancha", "Crunch", "Elevación de Piernas", "Russian Twist", "Ab Wheel", "Woodchop"],
};


interface ExerciseEntry {
  name: string;
  sets: string;
  reps: string;
  weight: string;
}

const emptyExercise = (): ExerciseEntry => ({ name: "", sets: "", reps: "", weight: "" });

function getWorkoutStreak(workouts: Workout[]): number {
  if (!workouts.length) return 0;
  const uniqueDates = [...new Set(workouts.map((w) => w.date))].sort(
    (a, b) => new Date(b).getTime() - new Date(a).getTime()
  );
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let streak = 0;
  for (let i = 0; i < uniqueDates.length; i++) {
    const expected = new Date(today);
    expected.setDate(expected.getDate() - i);
    const expStr = expected.toISOString().split("T")[0];
    if (uniqueDates[i] === expStr) {
      streak++;
    } else if (i === 0) {
      // Allow today to be missing (streak from yesterday)
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      if (uniqueDates[i] === yesterday.toISOString().split("T")[0]) {
        streak++;
      } else {
        break;
      }
    } else {
      break;
    }
  }
  return streak;
}

export function FitnessContent() {
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [weightData, setWeightData] = useState<{ date: string; rawDate: string; weight: number; bodyFat: number | null }[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [showWeightDialog, setShowWeightDialog] = useState(false);
  const [newWeight, setNewWeight] = useState({ weight: "", bodyFat: "", notes: "", date: new Date().toISOString().split("T")[0] });
  const [weightRange, setWeightRange] = useState<"1m" | "3m" | "6m" | "1y" | "all">("3m");
  const [newWorkout, setNewWorkout] = useState({
    name: "",
    duration: "",
    calories: "",
    date: new Date().toISOString().split("T")[0],
    groups: [] as string[],
  });
  const [exercises, setExercises] = useState<ExerciseEntry[]>([emptyExercise()]);
  const [liftingProgress, setLiftingProgress] = useState<
    { name: string; pr: number; latest: number; history: { date: string; weight: number }[] }[]
  >([]);
  const [editingWorkout, setEditingWorkout] = useState<Workout | null>(null);
  const [editExercises, setEditExercises] = useState<ExerciseEntry[]>([]);
  const [editGroups, setEditGroups] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: workoutsData } = await supabase
      .from("workouts")
      .select("*")
      .eq("user_id", user.id)
      .order("completed_at", { ascending: false })
      .limit(20);

    if (workoutsData) {
      const workoutIds = workoutsData.map((w) => w.id);
      const { data: exercisesData } = workoutIds.length
        ? await supabase
            .from("exercises")
            .select("*")
            .in("workout_id", workoutIds)
            .order("order_index")
        : { data: [] };

      const mapped: Workout[] = workoutsData.map((w) => ({
        id: w.id,
        name: w.name,
        type: w.type,
        duration: w.duration_minutes ?? 0,
        calories: w.calories_burned ?? 0,
        date: w.completed_at.split("T")[0],
        exercises: (exercisesData || [])
          .filter((e) => e.workout_id === w.id)
          .map((e) => ({
            name: e.name,
            sets: e.sets ?? 0,
            reps: e.reps ?? 0,
            weight: e.weight ?? 0,
          })),
      }));
      setWorkouts(mapped);
    }

    const { data: metricsData } = await supabase
      .from("body_metrics")
      .select("weight, body_fat_percentage, recorded_at")
      .eq("user_id", user.id)
      .not("weight", "is", null)
      .order("recorded_at")
      .limit(365);

    if (metricsData && metricsData.length > 0) {
      setWeightData(
        metricsData.map((m) => ({
          date: new Date(m.recorded_at).toLocaleDateString("es", { month: "short", day: "numeric" }),
          rawDate: new Date(m.recorded_at).toISOString().split("T")[0],
          weight: Number(m.weight),
          bodyFat: m.body_fat_percentage ? Number(m.body_fat_percentage) : null,
        }))
      );
    }

    // Fetch ALL exercises for lifting progress (not limited to 20 workouts)
    const { data: allWorkoutsData } = await supabase
      .from("workouts")
      .select("id, completed_at")
      .eq("user_id", user.id)
      .order("completed_at", { ascending: true });

    if (allWorkoutsData && allWorkoutsData.length > 0) {
      const allIds = allWorkoutsData.map((w) => w.id);
      const { data: allExData } = await supabase
        .from("exercises")
        .select("name, weight, sets, reps, workout_id")
        .in("workout_id", allIds);

      if (allExData) {
        const dateMap = new Map(allWorkoutsData.map((w) => [w.id, w.completed_at.split("T")[0]]));
        const grouped: Record<string, { date: string; weight: number; sets: number; reps: number }[]> = {};
        for (const ex of allExData) {
          if (!ex.weight || ex.weight <= 0) continue;
          const key = ex.name.trim().toLowerCase();
          if (!grouped[key]) grouped[key] = [];
          grouped[key].push({
            date: dateMap.get(ex.workout_id) ?? "",
            weight: Number(ex.weight),
            sets: ex.sets ?? 0,
            reps: ex.reps ?? 0,
          });
        }
        // Sort entries by date and build progress
        const progress: { name: string; pr: number; latest: number; history: { date: string; weight: number }[] }[] = [];
        for (const [key, entries] of Object.entries(grouped)) {
          entries.sort((a, b) => a.date.localeCompare(b.date));
          const originalName = allExData.find((e) => e.name.trim().toLowerCase() === key)?.name ?? key;
          const pr = Math.max(...entries.map((e) => e.weight));
          const latest = entries[entries.length - 1].weight;
          progress.push({
            name: originalName,
            pr,
            latest,
            history: entries.map((e) => ({ date: e.date, weight: e.weight })),
          });
        }
        progress.sort((a, b) => b.history.length - a.history.length);
        setLiftingProgress(progress);
      }
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAddWorkout = async () => {
    if (!newWorkout.name || saving) return;
    setSaving(true);
    try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const typeLabel = newWorkout.groups.length > 0
      ? newWorkout.groups.join(", ")
      : "Fuerza";
    const completedAt = newWorkout.date
      ? new Date(newWorkout.date + "T12:00:00").toISOString()
      : new Date().toISOString();

    const { data, error } = await supabase
      .from("workouts")
      .insert({
        user_id: user.id,
        name: newWorkout.name,
        type: typeLabel,
        duration_minutes: Number(newWorkout.duration) || null,
        calories_burned: Number(newWorkout.calories) || null,
        completed_at: completedAt,
      })
      .select()
      .single();

    if (data && !error) {
      // Insert exercises if any have a name
      const validExercises = exercises.filter((e) => e.name.trim());
      let savedExercises: { name: string; sets: number; reps: number; weight: number }[] = [];
      if (validExercises.length > 0) {
        const { data: exData } = await supabase
          .from("exercises")
          .insert(
            validExercises.map((e, i) => ({
              workout_id: data.id,
              name: e.name,
              sets: Number(e.sets) || null,
              reps: Number(e.reps) || null,
              weight: Number(e.weight) || null,
              order_index: i,
            }))
          )
          .select();
        if (exData) {
          savedExercises = exData.map((e) => ({
            name: e.name,
            sets: e.sets ?? 0,
            reps: e.reps ?? 0,
            weight: e.weight ?? 0,
          }));
        }
      }
      setWorkouts([
        {
          id: data.id,
          name: data.name,
          type: data.type,
          duration: data.duration_minutes ?? 0,
          calories: data.calories_burned ?? 0,
          date: data.completed_at.split("T")[0],
          exercises: savedExercises,
        },
        ...workouts,
      ]);
    }
    setNewWorkout({ name: "", duration: "", calories: "", date: new Date().toISOString().split("T")[0], groups: [] });
    setExercises([emptyExercise()]);
    setShowDialog(false);
    } finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    const supabase = createClient();
    await supabase.from("workouts").delete().eq("id", id);
    setWorkouts(workouts.filter((w) => w.id !== id));
  };

  const openEditWorkout = (workout: Workout) => {
    setEditingWorkout(workout);
    // Parse groups from type string
    const parsed = workout.type.split(",").map((s) => s.trim());
    const groups = parsed.filter((g) => tagOptions.includes(g));
    setEditGroups(groups);
    setEditExercises(
      workout.exercises.length > 0
        ? workout.exercises.map((e) => ({
            name: e.name,
            sets: e.sets > 0 ? String(e.sets) : "",
            reps: e.reps > 0 ? String(e.reps) : "",
            weight: e.weight > 0 ? String(e.weight) : "",
          }))
        : [emptyExercise()]
    );
  };

  const handleSaveEdit = async () => {
    if (!editingWorkout || saving) return;
    setSaving(true);
    try {
    const supabase = createClient();

    const editTypeLabel = editGroups.length > 0
      ? editGroups.join(", ")
      : editingWorkout.type;

    // Update workout name/type/duration/calories
    await supabase
      .from("workouts")
      .update({
        name: editingWorkout.name,
        type: editTypeLabel,
        duration_minutes: editingWorkout.duration || null,
        calories_burned: editingWorkout.calories || null,
      })
      .eq("id", editingWorkout.id);

    // Delete old exercises and insert new ones
    await supabase.from("exercises").delete().eq("workout_id", editingWorkout.id);

    const validExercises = editExercises.filter((e) => e.name.trim());
    let savedExercises: { name: string; sets: number; reps: number; weight: number }[] = [];
    if (validExercises.length > 0) {
      const { data: exData } = await supabase
        .from("exercises")
        .insert(
          validExercises.map((e, i) => ({
            workout_id: editingWorkout.id,
            name: e.name,
            sets: Number(e.sets) || null,
            reps: Number(e.reps) || null,
            weight: Number(e.weight) || null,
            order_index: i,
          }))
        )
        .select();
      if (exData) {
        savedExercises = exData.map((e) => ({
          name: e.name,
          sets: e.sets ?? 0,
          reps: e.reps ?? 0,
          weight: e.weight ?? 0,
        }));
      }
    }

    setWorkouts(
      workouts.map((w) =>
        w.id === editingWorkout.id
          ? { ...editingWorkout, type: editTypeLabel, exercises: savedExercises }
          : w
      )
    );
    setEditingWorkout(null);
    setEditExercises([]);
    setEditGroups([]);
    // Refresh lifting progress
    fetchData();
    } finally { setSaving(false); }
  };

  const handleLogWeight = async () => {
    if (!newWeight.weight || saving) return;
    setSaving(true);
    try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const recordedAt = newWeight.date ? new Date(newWeight.date + "T12:00:00").toISOString() : new Date().toISOString();

    const { data, error } = await supabase
      .from("body_metrics")
      .insert({
        user_id: user.id,
        weight: Number(newWeight.weight),
        body_fat_percentage: newWeight.bodyFat ? Number(newWeight.bodyFat) : null,
        notes: newWeight.notes || null,
        recorded_at: recordedAt,
      })
      .select()
      .single();

    if (data && !error) {
      const newEntry = {
        date: new Date(data.recorded_at).toLocaleDateString("es", { month: "short", day: "numeric" }),
        rawDate: new Date(data.recorded_at).toISOString().split("T")[0],
        weight: Number(data.weight),
        bodyFat: data.body_fat_percentage ? Number(data.body_fat_percentage) : null,
      };
      const updated = [...weightData, newEntry].sort((a, b) => a.rawDate.localeCompare(b.rawDate));
      setWeightData(updated);
    }
    setNewWeight({ weight: "", bodyFat: "", notes: "", date: new Date().toISOString().split("T")[0] });
    setShowWeightDialog(false);
    } finally { setSaving(false); }
  };

  const totalDuration = workouts.reduce((sum, w) => sum + w.duration, 0);
  const totalCalories = workouts.reduce((sum, w) => sum + w.calories, 0);

  // Weekly stats
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);
  const weekStr = startOfWeek.toISOString().split("T")[0];
  const weekWorkouts = workouts.filter((w) => w.date >= weekStr);
  const weekDuration = weekWorkouts.reduce((sum, w) => sum + w.duration, 0);
  const weekCalories = weekWorkouts.reduce((sum, w) => sum + w.calories, 0);
  const streak = getWorkoutStreak(workouts);

  // Filter weight data by selected range
  const filteredWeightData = (() => {
    if (weightRange === "all") return weightData;
    const cutoff = new Date();
    if (weightRange === "1m") cutoff.setMonth(cutoff.getMonth() - 1);
    else if (weightRange === "3m") cutoff.setMonth(cutoff.getMonth() - 3);
    else if (weightRange === "6m") cutoff.setMonth(cutoff.getMonth() - 6);
    else if (weightRange === "1y") cutoff.setFullYear(cutoff.getFullYear() - 1);
    const cutoffStr = cutoff.toISOString().split("T")[0];
    return weightData.filter((d) => d.rawDate >= cutoffStr);
  })();

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
          <h1 className="text-2xl font-bold tracking-tight">Fitness</h1>
          <p className="text-zinc-500 dark:text-zinc-400">
            Registra tus entrenamientos y métricas corporales.
          </p>
        </div>
        <Button onClick={() => setShowDialog(true)}>
          <Plus className="h-4 w-4" />
          Registrar Entreno
        </Button>
      </div>

      {/* Weekly Stats */}
      <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-lg bg-blue-100 p-2.5 dark:bg-blue-900/30">
              <Dumbbell className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Esta Semana
              </p>
              <p className="text-xl font-bold">{weekWorkouts.length}</p>
              <p className="text-[10px] text-zinc-400 dark:text-zinc-500">{workouts.length} total</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-lg bg-emerald-100 p-2.5 dark:bg-emerald-900/30">
              <Timer className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Minutos
              </p>
              <p className="text-xl font-bold">{weekDuration}</p>
              <p className="text-[10px] text-zinc-400 dark:text-zinc-500">{totalDuration} total</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-lg bg-orange-100 p-2.5 dark:bg-orange-900/30">
              <FlameIcon className="h-5 w-5 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Calorías
              </p>
              <p className="text-xl font-bold">{weekCalories.toLocaleString()}</p>
              <p className="text-[10px] text-zinc-400 dark:text-zinc-500">{totalCalories.toLocaleString()} total</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-lg bg-purple-100 p-2.5 dark:bg-purple-900/30">
              <Zap className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Racha
              </p>
              <p className="text-xl font-bold">{streak} <span className="text-sm font-normal">días</span></p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-lg bg-sky-100 p-2.5 dark:bg-sky-900/30">
              <CalendarDays className="h-5 w-5 text-sky-600 dark:text-sky-400" />
            </div>
            <div>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Promedio
              </p>
              <p className="text-xl font-bold">{weekDuration > 0 && weekWorkouts.length > 0 ? Math.round(weekDuration / weekWorkouts.length) : 0} <span className="text-sm font-normal">min/entreno</span></p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Body Weight & Lifting Progress */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Weight Chart */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Scale className="h-5 w-5 text-emerald-500" />
                  Progreso de Peso
                </CardTitle>
                <CardDescription>Tu tendencia de peso a lo largo del tiempo</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={() => setShowWeightDialog(true)} className="gap-1.5">
                <Plus className="h-3 w-3" />
                Registrar Peso
              </Button>
            </div>
            {weightData.length > 0 && (
              <div className="flex flex-wrap items-center gap-4 mt-2">
                <div className="text-center">
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">Actual</p>
                  <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{weightData[weightData.length - 1].weight} kg</p>
                </div>
                {filteredWeightData.length > 1 && (
                  <div className="text-center">
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">Cambio</p>
                    <p className={`text-lg font-bold ${filteredWeightData[filteredWeightData.length - 1].weight - filteredWeightData[0].weight < 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-500"}`}>
                      {(filteredWeightData[filteredWeightData.length - 1].weight - filteredWeightData[0].weight) > 0 ? "+" : ""}
                      {(filteredWeightData[filteredWeightData.length - 1].weight - filteredWeightData[0].weight).toFixed(1)} kg
                    </p>
                  </div>
                )}
                {weightData[weightData.length - 1].bodyFat && (
                  <div className="text-center">
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">Grasa Corp.</p>
                    <p className="text-lg font-bold text-sky-600 dark:text-sky-400">{weightData[weightData.length - 1].bodyFat}%</p>
                  </div>
                )}
                <div className="ml-auto flex gap-1">
                  {(["1m", "3m", "6m", "1y", "all"] as const).map((r) => (
                    <button
                      key={r}
                      onClick={() => setWeightRange(r)}
                      className={`rounded px-2 py-0.5 text-xs font-medium transition-colors ${
                        weightRange === r
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400"
                          : "text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                      }`}
                    >
                      {r === "all" ? "Todo" : r.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </CardHeader>
          <CardContent>
            {weightData.length > 0 ? (
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={filteredWeightData}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      className="stroke-zinc-200 dark:stroke-zinc-800"
                    />
                    <XAxis
                      dataKey="date"
                      tick={{ fill: "#a1a1aa", fontSize: 12 }}
                    />
                    <YAxis
                      yAxisId="weight"
                      domain={["dataMin - 2", "dataMax + 2"]}
                      tick={{ fill: "#a1a1aa", fontSize: 12 }}
                    />
                    {weightData.some((d) => d.bodyFat != null) && (
                      <YAxis
                        yAxisId="fat"
                        orientation="right"
                        domain={[0, 40]}
                        tick={{ fill: "#a1a1aa", fontSize: 12 }}
                        unit="%"
                      />
                    )}
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "var(--background)",
                        border: "1px solid #e4e4e7",
                        borderRadius: "8px",
                        fontSize: "12px",
                      }}
                    />
                    <Line
                      yAxisId="weight"
                      type="monotone"
                      dataKey="weight"
                      stroke="#10b981"
                      strokeWidth={2}
                      dot={{ fill: "#10b981", r: 4 }}
                      name="Peso (kg)"
                    />
                    {weightData.some((d) => d.bodyFat != null) && (
                      <Line
                        yAxisId="fat"
                        type="monotone"
                        dataKey="bodyFat"
                        stroke="#0ea5e9"
                        strokeWidth={2}
                        strokeDasharray="5 5"
                        dot={{ fill: "#0ea5e9", r: 3 }}
                        name="Grasa Corp. (%)"
                        connectNulls
                      />
                    )}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-center text-sm text-zinc-500 dark:text-zinc-400 py-8">
                No hay registros aún. Haz clic en &quot;Registrar Peso&quot; para comenzar.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Lifting Progress / PRs */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-amber-500" />
              Progreso de Fuerza
            </CardTitle>
            <CardDescription>Tus récords personales y progresión</CardDescription>
          </CardHeader>
          <CardContent>
            {liftingProgress.length > 0 ? (
              <div className="space-y-3 max-h-[350px] overflow-y-auto">
                {liftingProgress.map((ex) => {
                  const isNewPr = ex.latest >= ex.pr;
                  const firstWeight = ex.history[0].weight;
                  const change = ex.latest - firstWeight;
                  return (
                    <div key={ex.name} className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <Dumbbell className="h-4 w-4 text-zinc-500" />
                          <span className="text-sm font-medium">{ex.name}</span>
                          {isNewPr && (
                            <Badge variant="secondary" className="text-[10px] bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                              PR
                            </Badge>
                          )}
                        </div>
                        <span className="text-sm font-bold">{ex.pr} kg</span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
                        <span>{ex.history.length} registro{ex.history.length > 1 ? "s" : ""}</span>
                        {ex.history.length > 1 && (
                          <span className={change > 0 ? "text-emerald-600 dark:text-emerald-400" : change < 0 ? "text-red-500" : ""}>
                            {change > 0 ? "+" : ""}{change.toFixed(1)} kg desde inicio
                          </span>
                        )}
                      </div>
                      {ex.history.length > 1 && (
                        <div className="mt-2 h-[40px]">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={ex.history}>
                              <Line
                                type="monotone"
                                dataKey="weight"
                                stroke="#f59e0b"
                                strokeWidth={1.5}
                                dot={false}
                              />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-center text-sm text-zinc-500 dark:text-zinc-400 py-8">
                Registra ejercicios con peso en tus entrenamientos para ver tu progresión.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Workout List */}
        <Card>
          <CardHeader>
            <CardTitle>Entrenamientos Recientes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-[300px] overflow-y-auto">
              {workouts.map((workout) => (
                <div
                  key={workout.id}
                  className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-800 cursor-pointer transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-900/50"
                  onClick={() => openEditWorkout(workout)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="rounded-lg bg-zinc-100 p-2 dark:bg-zinc-800">
                        <Dumbbell className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{workout.name}</p>
                        <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                          <span>{workout.duration} min</span>
                          <span>•</span>
                          <span>{workout.calories} kcal</span>
                          <span>•</span>
                          <span>{workout.date}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">{workout.type}</Badge>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDelete(workout.id); }}
                        className="rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-red-500 dark:hover:bg-zinc-800"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  {workout.exercises.length > 0 && (
                    <div className="mt-2 ml-11 space-y-1">
                      {workout.exercises.map((ex, i) => (
                        <div key={i} className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                          <span className="font-medium text-zinc-600 dark:text-zinc-300">{ex.name}</span>
                          {ex.sets > 0 && <span>{ex.sets}×{ex.reps}</span>}
                          {ex.weight > 0 && <span>· {ex.weight} kg</span>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Add Workout Dialog */}
      <Dialog open={showDialog} onClose={() => setShowDialog(false)}>
        <DialogHeader>
          <DialogTitle>Registrar Entreno</DialogTitle>
        </DialogHeader>
        <div className="mt-4 space-y-4">
          <div>
            <label className="text-sm font-medium">Nombre del Entreno</label>
            <Input
              placeholder="Ej. Carrera matutina"
              value={newWorkout.name}
              onChange={(e) =>
                setNewWorkout({ ...newWorkout, name: e.target.value })
              }
              className="mt-1"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Fecha</label>
            <Input
              type="date"
              value={newWorkout.date}
              onChange={(e) => setNewWorkout({ ...newWorkout, date: e.target.value })}
              className="mt-1"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Grupos Musculares</label>
            <div className="mt-1 flex flex-wrap gap-2">
              {tagOptions.map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => {
                    const groups = newWorkout.groups.includes(g)
                      ? newWorkout.groups.filter((x) => x !== g)
                      : [...newWorkout.groups, g];
                    setNewWorkout({ ...newWorkout, groups });
                  }}
                  className={`rounded-full px-3 py-1 text-xs font-medium border transition-colors ${
                    newWorkout.groups.includes(g)
                      ? "bg-blue-100 border-blue-300 text-blue-700 dark:bg-blue-900/40 dark:border-blue-700 dark:text-blue-300"
                      : "border-zinc-200 text-zinc-500 hover:border-zinc-300 dark:border-zinc-700 dark:text-zinc-400"
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Duración (min)</label>
              <Input
                type="number"
                placeholder="30"
                value={newWorkout.duration}
                onChange={(e) =>
                  setNewWorkout({ ...newWorkout, duration: e.target.value })
                }
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Calorías</label>
              <Input
                type="number"
                placeholder="300"
                value={newWorkout.calories}
                onChange={(e) =>
                  setNewWorkout({ ...newWorkout, calories: e.target.value })
                }
                className="mt-1"
              />
            </div>
          </div>
          {/* Exercises - only for strength groups */}
          {!(newWorkout.groups.length > 0 && newWorkout.groups.every((g) => noExerciseTags.has(g))) && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium">Ejercicios (opcional)</label>
              <button
                type="button"
                onClick={() => setExercises([...exercises, emptyExercise()])}
                className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
              >
                + Agregar ejercicio
              </button>
            </div>
            <div className="space-y-3 max-h-[250px] overflow-y-auto">
              {exercises.map((ex, i) => (
                <div key={i} className="rounded-lg border border-zinc-200 p-2 dark:border-zinc-800 space-y-2">
                  <div className="flex items-center gap-2">
                    <Select
                      value={ex.name}
                      onChange={(e) => {
                        const updated = [...exercises];
                        updated[i] = { ...updated[i], name: e.target.value };
                        setExercises(updated);
                      }}
                      className="flex-1"
                    >
                      <option value="" disabled>Ejercicio...</option>
                      {Object.entries(muscleGroups)
                        .filter(([group]) => newWorkout.groups.length === 0 || newWorkout.groups.includes(group))
                        .map(([group, exList]) => (
                        <optgroup key={group} label={group}>
                          {exList.map((name) => (
                            <option key={name} value={name}>{name}</option>
                          ))}
                        </optgroup>
                      ))}
                    </Select>
                    {exercises.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setExercises(exercises.filter((_, j) => j !== i))}
                        className="rounded p-1 text-zinc-400 hover:text-red-500"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      placeholder="Series"
                      value={ex.sets}
                      onChange={(e) => {
                        const updated = [...exercises];
                        updated[i] = { ...updated[i], sets: e.target.value };
                        setExercises(updated);
                      }}
                      className="w-20"
                    />
                    <Input
                      type="number"
                      placeholder="Reps"
                      value={ex.reps}
                      onChange={(e) => {
                        const updated = [...exercises];
                        updated[i] = { ...updated[i], reps: e.target.value };
                        setExercises(updated);
                      }}
                      className="w-20"
                    />
                    <Input
                      type="number"
                      placeholder="Peso (kg)"
                      value={ex.weight}
                      onChange={(e) => {
                        const updated = [...exercises];
                        updated[i] = { ...updated[i], weight: e.target.value };
                        setExercises(updated);
                      }}
                      className="w-24"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleAddWorkout} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {saving ? "Guardando..." : "Guardar Entreno"}
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Log Weight Dialog */}
      <Dialog open={showWeightDialog} onClose={() => setShowWeightDialog(false)}>
        <DialogHeader>
          <DialogTitle>Registrar Peso Corporal</DialogTitle>
        </DialogHeader>
        <div className="mt-4 space-y-4">
          <div>
            <label className="text-sm font-medium">Fecha</label>
            <Input
              type="date"
              value={newWeight.date}
              onChange={(e) => setNewWeight({ ...newWeight, date: e.target.value })}
              className="mt-1"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Peso (kg)</label>
            <Input
              type="number"
              placeholder="Ej. 80"
              value={newWeight.weight}
              onChange={(e) => setNewWeight({ ...newWeight, weight: e.target.value })}
              className="mt-1"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Grasa Corporal % (opcional)</label>
            <Input
              type="number"
              placeholder="Ej. 18"
              value={newWeight.bodyFat}
              onChange={(e) => setNewWeight({ ...newWeight, bodyFat: e.target.value })}
              className="mt-1"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Notas (opcional)</label>
            <Input
              placeholder="Ej. Después del desayuno"
              value={newWeight.notes}
              onChange={(e) => setNewWeight({ ...newWeight, notes: e.target.value })}
              className="mt-1"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setShowWeightDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleLogWeight} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {saving ? "Guardando..." : "Guardar Peso"}
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Edit Workout Dialog */}
      <Dialog open={!!editingWorkout} onClose={() => { setEditingWorkout(null); setEditExercises([]); setEditGroups([]); }}>
        <DialogHeader>
          <DialogTitle>Editar Entreno</DialogTitle>
        </DialogHeader>
        {editingWorkout && (
          <div className="mt-4 space-y-4">
            <div>
              <label className="text-sm font-medium">Nombre del Entreno</label>
              <Input
                value={editingWorkout.name}
                onChange={(e) => setEditingWorkout({ ...editingWorkout, name: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Fecha</label>
              <Input
                type="date"
                value={editingWorkout.date}
                onChange={(e) => setEditingWorkout({ ...editingWorkout, date: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Grupos Musculares</label>
              <div className="mt-1 flex flex-wrap gap-2">
                {tagOptions.map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => {
                      setEditGroups(
                        editGroups.includes(g)
                          ? editGroups.filter((x) => x !== g)
                          : [...editGroups, g]
                      );
                    }}
                    className={`rounded-full px-3 py-1 text-xs font-medium border transition-colors ${
                      editGroups.includes(g)
                        ? "bg-blue-100 border-blue-300 text-blue-700 dark:bg-blue-900/40 dark:border-blue-700 dark:text-blue-300"
                        : "border-zinc-200 text-zinc-500 hover:border-zinc-300 dark:border-zinc-700 dark:text-zinc-400"
                    }`}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Duración (min)</label>
                <Input
                  type="number"
                  value={editingWorkout.duration || ""}
                  onChange={(e) => setEditingWorkout({ ...editingWorkout, duration: Number(e.target.value) || 0 })}
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Calorías</label>
                <Input
                  type="number"
                  value={editingWorkout.calories || ""}
                  onChange={(e) => setEditingWorkout({ ...editingWorkout, calories: Number(e.target.value) || 0 })}
                  className="mt-1"
                />
              </div>
            </div>
            {/* Edit Exercises - only for strength groups */}
            {!(editGroups.length > 0 && editGroups.every((g) => noExerciseTags.has(g))) && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium">Ejercicios</label>
                <button
                  type="button"
                  onClick={() => setEditExercises([...editExercises, emptyExercise()])}
                  className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                >
                  + Agregar ejercicio
                </button>
              </div>
              <div className="space-y-3 max-h-[250px] overflow-y-auto">
                {editExercises.map((ex, i) => (
                  <div key={i} className="rounded-lg border border-zinc-200 p-2 dark:border-zinc-800 space-y-2">
                    <div className="flex items-center gap-2">
                      <Select
                        value={ex.name}
                        onChange={(e) => {
                          const updated = [...editExercises];
                          updated[i] = { ...updated[i], name: e.target.value };
                          setEditExercises(updated);
                        }}
                        className="flex-1"
                      >
                        <option value="" disabled>Ejercicio...</option>
                        {Object.entries(muscleGroups)
                          .filter(([group]) => editGroups.length === 0 || editGroups.includes(group))
                          .map(([group, exList]) => (
                          <optgroup key={group} label={group}>
                            {exList.map((name) => (
                              <option key={name} value={name}>{name}</option>
                            ))}
                          </optgroup>
                        ))}
                      </Select>
                      {editExercises.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setEditExercises(editExercises.filter((_, j) => j !== i))}
                          className="rounded p-1 text-zinc-400 hover:text-red-500"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        placeholder="Series"
                        value={ex.sets}
                        onChange={(e) => {
                          const updated = [...editExercises];
                          updated[i] = { ...updated[i], sets: e.target.value };
                          setEditExercises(updated);
                        }}
                        className="w-20"
                      />
                      <Input
                        type="number"
                        placeholder="Reps"
                        value={ex.reps}
                        onChange={(e) => {
                          const updated = [...editExercises];
                          updated[i] = { ...updated[i], reps: e.target.value };
                          setEditExercises(updated);
                        }}
                        className="w-20"
                      />
                      <Input
                        type="number"
                        placeholder="Peso (kg)"
                        value={ex.weight}
                        onChange={(e) => {
                          const updated = [...editExercises];
                          updated[i] = { ...updated[i], weight: e.target.value };
                          setEditExercises(updated);
                        }}
                        className="w-24"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => { setEditingWorkout(null); setEditExercises([]); setEditGroups([]); }}>
                Cancelar
              </Button>
              <Button onClick={handleSaveEdit} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {saving ? "Guardando..." : "Guardar Cambios"}
              </Button>
            </div>
          </div>
        )}
      </Dialog>
    </div>
  );
}
