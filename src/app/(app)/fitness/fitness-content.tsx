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

const workoutTypes = [
  "Fuerza",
  "Cardio",
  "HIIT",
  "Yoga",
  "Natación",
  "Ciclismo",
  "Correr",
  "Otro",
];


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
  const [weightData, setWeightData] = useState<{ date: string; weight: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [newWorkout, setNewWorkout] = useState({
    name: "",
    type: "Fuerza",
    duration: "",
    calories: "",
  });
  const [exercises, setExercises] = useState<ExerciseEntry[]>([emptyExercise()]);

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
      .select("weight, recorded_at")
      .eq("user_id", user.id)
      .not("weight", "is", null)
      .order("recorded_at")
      .limit(12);

    if (metricsData && metricsData.length > 0) {
      setWeightData(
        metricsData.map((m) => ({
          date: new Date(m.recorded_at).toLocaleDateString("es", { month: "short", day: "numeric" }),
          weight: Number(m.weight),
        }))
      );
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAddWorkout = async () => {
    if (!newWorkout.name) return;
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("workouts")
      .insert({
        user_id: user.id,
        name: newWorkout.name,
        type: newWorkout.type,
        duration_minutes: Number(newWorkout.duration) || null,
        calories_burned: Number(newWorkout.calories) || null,
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
    setNewWorkout({ name: "", type: "Fuerza", duration: "", calories: "" });
    setExercises([emptyExercise()]);
    setShowDialog(false);
  };

  const handleDelete = async (id: string) => {
    const supabase = createClient();
    await supabase.from("workouts").delete().eq("id", id);
    setWorkouts(workouts.filter((w) => w.id !== id));
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

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Weight Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-emerald-500" />
              Progreso de Peso
            </CardTitle>
            <CardDescription>Tu tendencia de peso a lo largo del tiempo</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={weightData}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    className="stroke-zinc-200 dark:stroke-zinc-800"
                  />
                  <XAxis
                    dataKey="date"
                    tick={{ fill: "#a1a1aa", fontSize: 12 }}
                  />
                  <YAxis
                    domain={["dataMin - 2", "dataMax + 2"]}
                    tick={{ fill: "#a1a1aa", fontSize: 12 }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "var(--background)",
                      border: "1px solid #e4e4e7",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="weight"
                    stroke="#10b981"
                    strokeWidth={2}
                    dot={{ fill: "#10b981", r: 4 }}
                    name="Peso (lbs)"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

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
                  className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-800"
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
                          <span>{workout.calories} cal</span>
                          <span>•</span>
                          <span>{workout.date}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">{workout.type}</Badge>
                      <button
                        onClick={() => handleDelete(workout.id)}
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
                          {ex.weight > 0 && <span>· {ex.weight} lbs</span>}
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
            <label className="text-sm font-medium">Tipo</label>
            <Select
              value={newWorkout.type}
              onChange={(e) =>
                setNewWorkout({ ...newWorkout, type: e.target.value })
              }
              className="mt-1"
            >
              {workoutTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </Select>
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
          {/* Exercises */}
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
            <div className="space-y-2 max-h-[200px] overflow-y-auto">
              {exercises.map((ex, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Input
                    placeholder="Nombre"
                    value={ex.name}
                    onChange={(e) => {
                      const updated = [...exercises];
                      updated[i] = { ...updated[i], name: e.target.value };
                      setExercises(updated);
                    }}
                    className="flex-1"
                  />
                  <Input
                    type="number"
                    placeholder="Series"
                    value={ex.sets}
                    onChange={(e) => {
                      const updated = [...exercises];
                      updated[i] = { ...updated[i], sets: e.target.value };
                      setExercises(updated);
                    }}
                    className="w-16"
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
                    className="w-16"
                  />
                  <Input
                    type="number"
                    placeholder="Peso"
                    value={ex.weight}
                    onChange={(e) => {
                      const updated = [...exercises];
                      updated[i] = { ...updated[i], weight: e.target.value };
                      setExercises(updated);
                    }}
                    className="w-16"
                  />
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
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleAddWorkout}>Guardar Entreno</Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
