"use client";

import { useState } from "react";
import { completeSetup } from "@/app/actions/settings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Flame, Loader2, DollarSign, Wallet } from "lucide-react";
import { CURRENCIES } from "@/lib/currencies";

interface SetupFormProps {
  defaultName: string;
  email: string;
}

export function SetupForm({ defaultName, email }: SetupFormProps) {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(0);

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setError(null);
    const result = await completeSetup(formData);
    if (result?.error) {
      setError(result.error);
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 dark:bg-zinc-950">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-100 dark:bg-orange-900/30">
            <Flame className="h-7 w-7 text-orange-500" />
          </div>
          <CardTitle className="text-2xl">
            {step === 0 ? "¡Bienvenido a GrowthOS!" : "Configura tus Finanzas"}
          </CardTitle>
          <CardDescription>
            {step === 0
              ? "Personalicemos tu experiencia"
              : "Configura tus preferencias de ingreso y moneda"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={handleSubmit}>
            {error && (
              <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
                {error}
              </div>
            )}

            {step === 0 && (
              <div className="space-y-4">
                <div>
                  <label htmlFor="fullName" className="text-sm font-medium">
                    Tu Nombre
                  </label>
                  <Input
                    id="fullName"
                    name="fullName"
                    defaultValue={defaultName}
                    placeholder="Tu nombre"
                    required
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Correo</label>
                  <Input
                    value={email}
                    disabled
                    className="mt-1 bg-zinc-50 dark:bg-zinc-900"
                  />
                </div>
                <Button
                  type="button"
                  className="w-full"
                  onClick={() => setStep(1)}
                >
                  Continuar
                </Button>
              </div>
            )}

            {step === 1 && (
              <div className="space-y-4">
                {/* Hidden field for name */}
                <input type="hidden" name="fullName" value={defaultName} />

                <div>
                  <label
                    htmlFor="monthlyIncome"
                    className="flex items-center gap-2 text-sm font-medium"
                  >
                    <DollarSign className="h-4 w-4 text-emerald-500" />
                    Ingreso Mensual
                  </label>
                  <Input
                    id="monthlyIncome"
                    name="monthlyIncome"
                    type="number"
                    placeholder="0"
                    min={0}
                    step="0.01"
                    required
                    className="mt-1"
                  />
                  <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">
                    Puedes actualizar esto cada 30 días
                  </p>
                </div>

                <div>
                  <label
                    htmlFor="incomeCurrency"
                    className="flex items-center gap-2 text-sm font-medium"
                  >
                    <Wallet className="h-4 w-4 text-blue-500" />
                    Moneda de Ingreso
                  </label>
                  <Select
                    id="incomeCurrency"
                    name="incomeCurrency"
                    defaultValue="CRC"
                    className="mt-1"
                  >
                    {CURRENCIES.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.symbol} {c.code} — {c.name}
                      </option>
                    ))}
                  </Select>
                  <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">
                    La moneda en la que recibes tu salario
                  </p>
                </div>

                <div>
                  <label
                    htmlFor="spendingCurrency"
                    className="flex items-center gap-2 text-sm font-medium"
                  >
                    <Wallet className="h-4 w-4 text-purple-500" />
                    Moneda de Gastos
                  </label>
                  <Select
                    id="spendingCurrency"
                    name="spendingCurrency"
                    defaultValue="CRC"
                    className="mt-1"
                  >
                    {CURRENCIES.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.symbol} {c.code} — {c.name}
                      </option>
                    ))}
                  </Select>
                  <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">
                    La moneda en la que registras gastos diarios
                  </p>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={() => setStep(0)}
                  >
                    Atrás
                  </Button>
                  <Button type="submit" className="flex-1" disabled={loading}>
                    {loading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "Comenzar"
                    )}
                  </Button>
                </div>
              </div>
            )}

            {/* Step indicators */}
            <div className="mt-6 flex justify-center gap-2">
              {[0, 1].map((i) => (
                <div
                  key={i}
                  className={`h-1.5 w-8 rounded-full transition-colors ${
                    i <= step
                      ? "bg-orange-500"
                      : "bg-zinc-200 dark:bg-zinc-800"
                  }`}
                />
              ))}
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
