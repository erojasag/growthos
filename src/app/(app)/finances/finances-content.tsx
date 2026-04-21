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
  ArrowDownRight,
  TrendingUp,
  Trash2,
  DollarSign,
  PiggyBank,
  CreditCard,
  ArrowRightLeft,
  RefreshCw,
  Pencil,
  Lock,
  Banknote,
  Landmark,
  Repeat,
  Wallet,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { createClient } from "@/lib/supabase/client";
import { CURRENCIES, getDaysUntilIncomeEdit, convertToTarget } from "@/lib/currencies";

interface Transaction {
  id: string;
  amount: number;
  type: "income" | "expense";
  category: string;
  description: string;
  currency: string;
  date: string;
}

const expenseCategories = [
  "Food & Dining",
  "Transportation",
  "Shopping",
  "Bills & Utilities",
  "Entertainment",
  "Health",
  "Education",
  "Other",
];

const PIE_COLORS = [
  "#3b82f6",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#ec4899",
  "#06b6d4",
  "#84cc16",
];


interface ExchangeRate {
  compra: number;
  venta: number;
  updated: string;
}

function computeMonthlyExpenses(
  txs: Transaction[],
  targetCurrency: string,
  rate: { compra: number; venta: number } | null
) {
  const months: Record<string, number> = {};
  txs
    .filter((t) => t.type === "expense")
    .forEach((t) => {
      const d = new Date(t.date);
      const key = d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
      months[key] = (months[key] || 0) + convertToTarget(t.amount, t.currency, targetCurrency, rate);
    });
  return Object.entries(months)
    .map(([month, expenses]) => ({ month, expenses }))
    .slice(-6);
}

export function FinancesContent() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budgets, setBudgets] = useState<{ category: string; amount: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [newTx, setNewTx] = useState({
    amount: "",
    category: "Food & Dining",
    description: "",
    currency: "CRC",
    cardId: "",
  });

  // User settings
  const [settings, setSettings] = useState<{
    monthly_income: number;
    income_currency: string;
    spending_currency: string;
    income_updated_at: string;
  } | null>(null);
  const [showIncomeDialog, setShowIncomeDialog] = useState(false);
  const [newIncome, setNewIncome] = useState("");
  const [incomeError, setIncomeError] = useState<string | null>(null);

  // Income sources
  const [incomeSources, setIncomeSources] = useState<
    { id: string; name: string; amount: number; frequency: "monthly" | "one-time" }[]
  >([]);
  const [showSourceDialog, setShowSourceDialog] = useState(false);
  const [newSource, setNewSource] = useState({ name: "", amount: "", frequency: "monthly" as "monthly" | "one-time" });

  // Recurring expenses
  const [recurringExpenses, setRecurringExpenses] = useState<
    { id: string; name: string; amount: number; currency: string; category: string }[]
  >([]);
  const [showRecurringDialog, setShowRecurringDialog] = useState(false);
  const [newRecurring, setNewRecurring] = useState({ name: "", amount: "", category: "Bills & Utilities", currency: "CRC" });

  // Credit cards
  interface CreditCardData {
    id: string;
    name: string;
    last_four: string;
    credit_limit: number;
    balance_crc: number;
    balance_usd: number;
    billing_date: number;
    due_date: number;
  }
  const [creditCards, setCreditCards] = useState<CreditCardData[]>([]);
  const [showCardDialog, setShowCardDialog] = useState(false);
  const [newCard, setNewCard] = useState({ name: "", last_four: "", credit_limit: "", balance_crc: "", balance_usd: "", billing_date: "1", due_date: "15" });
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [paymentCardId, setPaymentCardId] = useState<string | null>(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [cardPayments, setCardPayments] = useState<{ id: string; card_id: string; amount: number; currency: string; paid_at: string }[]>([]);

  // Investments
  const [investments, setInvestments] = useState<
    { id: string; name: string; amount: number; notes: string; invested_at: string }[]
  >([]);
  const [showInvestDialog, setShowInvestDialog] = useState(false);
  const [newInvest, setNewInvest] = useState({ name: "", amount: "", notes: "" });

  // Exchange rate state
  const [exchangeRate, setExchangeRate] = useState<ExchangeRate | null>(null);
  const [rateLoading, setRateLoading] = useState(true);
  const [rateError, setRateError] = useState<string | null>(null);
  const [convertAmount, setConvertAmount] = useState("");
  const [convertDirection, setConvertDirection] = useState<"crc-to-usd" | "usd-to-crc">("crc-to-usd");

  const fetchFinances = useCallback(async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: txData } = await supabase
      .from("transactions")
      .select("*")
      .eq("user_id", user.id)
      .order("date", { ascending: false })
      .limit(100);

    if (txData) {
      setTransactions(
        txData.map((t) => ({
          id: t.id,
          amount: Number(t.amount),
          type: t.type,
          category: t.category,
          description: t.description ?? "",
          currency: t.currency ?? "CRC",
          date: t.date,
        }))
      );
    }

    const currentMonth = new Date().toISOString().slice(0, 7);
    const { data: budgetData } = await supabase
      .from("budgets")
      .select("category, amount")
      .eq("user_id", user.id)
      .eq("month", currentMonth);

    if (budgetData) {
      setBudgets(budgetData.map((b) => ({ category: b.category, amount: Number(b.amount) })));
    }

    const { data: settingsData } = await supabase
      .from("user_settings")
      .select("monthly_income, income_currency, spending_currency, income_updated_at")
      .eq("user_id", user.id)
      .single();

    if (settingsData) {
      setSettings({
        monthly_income: Number(settingsData.monthly_income),
        income_currency: settingsData.income_currency,
        spending_currency: settingsData.spending_currency,
        income_updated_at: settingsData.income_updated_at,
      });
    }

    const { data: sourcesData } = await supabase
      .from("income_sources")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at");

    if (sourcesData) {
      setIncomeSources(
        sourcesData.map((s) => ({
          id: s.id,
          name: s.name,
          amount: Number(s.amount),
          frequency: s.frequency,
        }))
      );
    }

    const { data: recurringData } = await supabase
      .from("recurring_expenses")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at");

    if (recurringData) {
      setRecurringExpenses(
        recurringData.map((r) => ({
          id: r.id,
          name: r.name,
          amount: Number(r.amount),
          currency: r.currency ?? "CRC",
          category: r.category,
        }))
      );
    }

    const { data: cardData } = await supabase
      .from("credit_cards")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at");

    if (cardData) {
      setCreditCards(
        cardData.map((c) => ({
          id: c.id,
          name: c.name,
          last_four: c.last_four,
          credit_limit: Number(c.credit_limit),
          balance_crc: Number(c.balance_crc),
          balance_usd: Number(c.balance_usd),
          billing_date: c.billing_date,
          due_date: c.due_date,
        }))
      );
    }

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    const monthStart = startOfMonth.toISOString().split("T")[0];

    const { data: paymentData } = await supabase
      .from("credit_card_payments")
      .select("*")
      .eq("user_id", user.id)
      .gte("paid_at", monthStart)
      .order("created_at", { ascending: false });

    if (paymentData) {
      setCardPayments(
        paymentData.map((p) => ({
          id: p.id,
          card_id: p.card_id,
          amount: Number(p.amount),
          currency: p.currency,
          paid_at: p.paid_at,
        }))
      );
    }

    const { data: investData } = await supabase
      .from("investments")
      .select("*")
      .eq("user_id", user.id)
      .order("invested_at", { ascending: false });

    if (investData) {
      setInvestments(
        investData.map((inv) => ({
          id: inv.id,
          name: inv.name,
          amount: Number(inv.amount),
          notes: inv.notes ?? "",
          invested_at: inv.invested_at,
        }))
      );
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    fetchFinances();
  }, [fetchFinances]);

  const fetchExchangeRate = useCallback(async () => {
    setRateLoading(true);
    setRateError(null);
    try {
      const res = await fetch("/api/exchange-rate");
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setExchangeRate(data);
    } catch {
      setRateError("Could not load exchange rate");
    } finally {
      setRateLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchExchangeRate();
  }, [fetchExchangeRate]);

  const convertedAmount = (() => {
    if (!exchangeRate || !convertAmount || isNaN(Number(convertAmount))) return null;
    const amt = Number(convertAmount);
    if (convertDirection === "crc-to-usd") {
      return amt / exchangeRate.compra;
    } else {
      return amt * exchangeRate.venta;
    }
  })();

  const currency = settings?.spending_currency ?? "CRC";
  const incomeCurrency = settings?.income_currency ?? "CRC";

  const extraSourcesTotal = incomeSources.reduce((sum, s) => sum + s.amount, 0);
  const totalRealIncome = (settings?.monthly_income ?? 0) + extraSourcesTotal;

  const totalExpenses = transactions
    .filter((t) => t.type === "expense")
    .reduce((sum, t) => sum + convertToTarget(t.amount, t.currency, currency, exchangeRate), 0);

  const totalRecurring = recurringExpenses.reduce(
    (sum, r) => sum + convertToTarget(r.amount, r.currency, currency, exchangeRate), 0
  );
  const totalInvested = investments.reduce((sum, inv) => sum + inv.amount, 0);
  const totalCardPayments = cardPayments.reduce(
    (sum, p) => sum + convertToTarget(p.amount, p.currency, currency, exchangeRate), 0
  );
  const remaining = totalRealIncome - totalExpenses - totalRecurring - totalInvested - totalCardPayments;
  const savingsRate = totalRealIncome > 0 ? Math.round((remaining / totalRealIncome) * 100) : 0;

  const expensesByCategory = transactions
    .filter((t) => t.type === "expense")
    .reduce(
      (acc, t) => {
        acc[t.category] = (acc[t.category] || 0) + convertToTarget(t.amount, t.currency, currency, exchangeRate);
        return acc;
      },
      {} as Record<string, number>
    );

  const pieData = Object.entries(expensesByCategory).map(([name, value]) => ({
    name,
    value: Math.round(value * 100) / 100,
  }));

  const handleAddTransaction = async () => {
    if (!newTx.amount) return;
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("transactions")
      .insert({
        user_id: user.id,
        amount: Number(newTx.amount),
        type: "expense" as const,
        category: newTx.category,
        description: newTx.description || null,
        currency: newTx.currency,
      })
      .select()
      .single();

    if (data && !error) {
      setTransactions([
        {
          id: data.id,
          amount: Number(data.amount),
          type: data.type,
          category: data.category,
          description: data.description ?? "",
          currency: data.currency ?? "CRC",
          date: data.date,
        },
        ...transactions,
      ]);

      if (newTx.cardId) {
        const card = creditCards.find((c) => c.id === newTx.cardId);
        if (card) {
          if (newTx.currency === "USD") {
            const newBal = card.balance_usd + Number(newTx.amount);
            await supabase.from("credit_cards").update({ balance_usd: newBal }).eq("id", card.id);
            setCreditCards(creditCards.map((c) => c.id === card.id ? { ...c, balance_usd: newBal } : c));
          } else {
            const amt = convertToTarget(Number(newTx.amount), newTx.currency, "CRC", exchangeRate);
            const newBal = card.balance_crc + amt;
            await supabase.from("credit_cards").update({ balance_crc: newBal }).eq("id", card.id);
            setCreditCards(creditCards.map((c) => c.id === card.id ? { ...c, balance_crc: newBal } : c));
          }
        }
      }
    }
    setNewTx({ amount: "", category: "Food & Dining", description: "", currency: "CRC", cardId: "" });
    setShowDialog(false);
  };

  const handleDelete = async (id: string) => {
    const supabase = createClient();
    await supabase.from("transactions").delete().eq("id", id);
    setTransactions(transactions.filter((t) => t.id !== id));
  };

  const handleUpdateIncome = async () => {
    if (!newIncome) return;
    setIncomeError(null);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    if (settings) {
      const daysLeft = getDaysUntilIncomeEdit(settings.income_updated_at);
      if (daysLeft > 0) {
        setIncomeError(`You can change your income in ${daysLeft} days`);
        return;
      }
    }

    const { error } = await supabase
      .from("user_settings")
      .update({
        monthly_income: Number(newIncome),
        income_updated_at: new Date().toISOString(),
      })
      .eq("user_id", user.id);

    if (error) {
      setIncomeError(error.message);
      return;
    }

    setSettings((prev) =>
      prev ? { ...prev, monthly_income: Number(newIncome), income_updated_at: new Date().toISOString() } : prev
    );
    setNewIncome("");
    setShowIncomeDialog(false);
  };

  const handleAddSource = async () => {
    if (!newSource.name || !newSource.amount) return;
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("income_sources")
      .insert({
        user_id: user.id,
        name: newSource.name,
        amount: Number(newSource.amount),
        frequency: newSource.frequency,
      })
      .select()
      .single();

    if (data && !error) {
      setIncomeSources([
        ...incomeSources,
        { id: data.id, name: data.name, amount: Number(data.amount), frequency: data.frequency },
      ]);
    }
    setNewSource({ name: "", amount: "", frequency: "monthly" });
    setShowSourceDialog(false);
  };

  const handleAddCard = async () => {
    if (!newCard.name || !newCard.last_four) return;
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("credit_cards")
      .insert({
        user_id: user.id,
        name: newCard.name,
        last_four: newCard.last_four,
        credit_limit: Number(newCard.credit_limit),
        balance_crc: Number(newCard.balance_crc) || 0,
        balance_usd: Number(newCard.balance_usd) || 0,
        billing_date: Number(newCard.billing_date),
        due_date: Number(newCard.due_date),
      })
      .select()
      .single();

    if (data && !error) {
      setCreditCards([
        ...creditCards,
        {
          id: data.id,
          name: data.name,
          last_four: data.last_four,
          credit_limit: Number(data.credit_limit),
          balance_crc: Number(data.balance_crc),
          balance_usd: Number(data.balance_usd),
          billing_date: data.billing_date,
          due_date: data.due_date,
        },
      ]);
    }
    setNewCard({ name: "", last_four: "", credit_limit: "", balance_crc: "", balance_usd: "", billing_date: "1", due_date: "15" });
    setShowCardDialog(false);
  };

  const handleDeleteCard = async (id: string) => {
    const supabase = createClient();
    await supabase.from("credit_cards").delete().eq("id", id);
    setCreditCards(creditCards.filter((c) => c.id !== id));
  };

  const [paymentCurrency, setPaymentCurrency] = useState<"CRC" | "USD">("CRC");

  const handleLogPayment = async () => {
    if (!paymentCardId || !paymentAmount) return;
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const card = creditCards.find((c) => c.id === paymentCardId);
    if (!card) return;

    const currentBal = paymentCurrency === "USD" ? card.balance_usd : card.balance_crc;
    const newBal = Math.max(0, currentBal - Number(paymentAmount));

    const updatePayload = paymentCurrency === "USD"
      ? { balance_usd: newBal }
      : { balance_crc: newBal };

    const { error: updateErr } = await supabase
      .from("credit_cards")
      .update(updatePayload)
      .eq("id", paymentCardId);

    const { data: paymentRec, error: insertErr } = await supabase
      .from("credit_card_payments")
      .insert({
        user_id: user.id,
        card_id: paymentCardId,
        amount: Number(paymentAmount),
        currency: paymentCurrency,
      })
      .select()
      .single();

    if (!updateErr) {
      setCreditCards(
        creditCards.map((c) =>
          c.id === paymentCardId ? { ...c, ...updatePayload } : c
        )
      );
    }
    if (paymentRec && !insertErr) {
      setCardPayments([
        {
          id: paymentRec.id,
          card_id: paymentRec.card_id,
          amount: Number(paymentRec.amount),
          currency: paymentRec.currency,
          paid_at: paymentRec.paid_at,
        },
        ...cardPayments,
      ]);
    }
    setPaymentAmount("");
    setPaymentCardId(null);
    setPaymentCurrency("CRC");
    setShowPaymentDialog(false);
  };

  const handleAddRecurring = async () => {
    if (!newRecurring.name || !newRecurring.amount) return;
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("recurring_expenses")
      .insert({
        user_id: user.id,
        name: newRecurring.name,
        amount: Number(newRecurring.amount),
        currency: newRecurring.currency,
        category: newRecurring.category,
      })
      .select()
      .single();

    if (data && !error) {
      setRecurringExpenses([
        ...recurringExpenses,
        { id: data.id, name: data.name, amount: Number(data.amount), currency: data.currency ?? "CRC", category: data.category },
      ]);
    }
    setNewRecurring({ name: "", amount: "", category: "Bills & Utilities", currency: "CRC" });
    setShowRecurringDialog(false);
  };

  const handleDeleteRecurring = async (id: string) => {
    const supabase = createClient();
    await supabase.from("recurring_expenses").delete().eq("id", id);
    setRecurringExpenses(recurringExpenses.filter((r) => r.id !== id));
  };

  const handleAddInvestment = async () => {
    if (!newInvest.name || !newInvest.amount) return;
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("investments")
      .insert({
        user_id: user.id,
        name: newInvest.name,
        amount: Number(newInvest.amount),
        notes: newInvest.notes || null,
      })
      .select()
      .single();

    if (data && !error) {
      setInvestments([
        { id: data.id, name: data.name, amount: Number(data.amount), notes: data.notes ?? "", invested_at: data.invested_at },
        ...investments,
      ]);
    }
    setNewInvest({ name: "", amount: "", notes: "" });
    setShowInvestDialog(false);
  };

  const handleDeleteInvestment = async (id: string) => {
    const supabase = createClient();
    await supabase.from("investments").delete().eq("id", id);
    setInvestments(investments.filter((inv) => inv.id !== id));
  };

  const handleDeleteSource = async (id: string) => {
    const supabase = createClient();
    await supabase.from("income_sources").delete().eq("id", id);
    setIncomeSources(incomeSources.filter((s) => s.id !== id));
  };

  const daysUntilEdit = settings ? getDaysUntilIncomeEdit(settings.income_updated_at) : 0;
  const canEditIncome = daysUntilEdit === 0;

  const monthlyData = computeMonthlyExpenses(transactions, currency, exchangeRate);

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
          <h1 className="text-2xl font-bold tracking-tight">Finances</h1>
          <p className="text-zinc-500 dark:text-zinc-400">
            Track income, expenses, and budgets.
          </p>
        </div>
        <Button onClick={() => setShowDialog(true)}>
          <Plus className="h-4 w-4" />
          Add Expense
        </Button>
      </div>

      {/* Income Breakdown */}
      {settings && (
        <Card className="border-emerald-200 dark:border-emerald-900/50">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Banknote className="h-5 w-5 text-emerald-500" />
                Income Overview
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowSourceDialog(true)}
                className="gap-1.5"
              >
                <Plus className="h-3 w-3" />
                Add Source
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Total Real Income */}
            <div className="rounded-lg bg-emerald-50 p-4 dark:bg-emerald-900/20">
              <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">Total Real Income</p>
              <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">
                {formatCurrency(totalRealIncome, incomeCurrency)}
              </p>
              <p className="mt-0.5 text-xs text-emerald-600/70 dark:text-emerald-400/70">
                Monthly salary + all extra sources
              </p>
            </div>

            {/* Breakdown items */}
            <div className="space-y-2">
              {/* Base salary */}
              <div className="flex items-center justify-between rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-emerald-100 p-2 dark:bg-emerald-900/30">
                    <DollarSign className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Monthly Salary</p>
                    <p className="text-xs text-zinc-400 dark:text-zinc-500">Base income</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                    {formatCurrency(settings.monthly_income, incomeCurrency)}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      if (canEditIncome) {
                        setNewIncome(String(settings.monthly_income));
                        setIncomeError(null);
                        setShowIncomeDialog(true);
                      }
                    }}
                    disabled={!canEditIncome}
                    className="h-7 w-7 p-0"
                    title={canEditIncome ? "Edit income" : `Locked for ${daysUntilEdit} more days`}
                  >
                    {canEditIncome ? (
                      <Pencil className="h-3 w-3" />
                    ) : (
                      <Lock className="h-3 w-3 text-zinc-400" />
                    )}
                  </Button>
                </div>
              </div>

              {/* Extra income sources */}
              {incomeSources.map((source) => (
                <div
                  key={source.id}
                  className="flex items-center justify-between rounded-lg border border-zinc-200 p-3 dark:border-zinc-800"
                >
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-blue-100 p-2 dark:bg-blue-900/30">
                      <TrendingUp className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{source.name}</p>
                      <Badge variant="secondary" className="text-[10px]">
                        {source.frequency === "monthly" ? "Monthly" : "One-time"}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                      +{formatCurrency(source.amount, incomeCurrency)}
                    </span>
                    <button
                      onClick={() => handleDeleteSource(source.id)}
                      className="rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-red-500 dark:hover:bg-zinc-800"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}

              {incomeSources.length === 0 && (
                <p className="py-2 text-center text-sm text-zinc-400 dark:text-zinc-500">
                  No extra income sources yet. Click &quot;Add Source&quot; to add one.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Fixed Monthly Bills */}
      <Card className="border-orange-200 dark:border-orange-900/50">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Repeat className="h-5 w-5 text-orange-500" />
              Fixed Monthly Bills
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowRecurringDialog(true)}
              className="gap-1.5"
            >
              <Plus className="h-3 w-3" />
              Add Bill
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg bg-orange-50 p-4 dark:bg-orange-900/20">
            <p className="text-sm font-medium text-orange-700 dark:text-orange-300">Total Fixed Costs</p>
            <p className="text-3xl font-bold text-orange-600 dark:text-orange-400">
              {formatCurrency(totalRecurring, currency)}
            </p>
            <p className="mt-0.5 text-xs text-orange-600/70 dark:text-orange-400/70">
              {recurringExpenses.length} recurring bill{recurringExpenses.length !== 1 ? "s" : ""} per month
            </p>
          </div>

          <div className="space-y-2">
            {recurringExpenses.map((bill) => (
              <div
                key={bill.id}
                className="flex items-center justify-between rounded-lg border border-zinc-200 p-3 dark:border-zinc-800"
              >
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-orange-100 p-2 dark:bg-orange-900/30">
                    <Repeat className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{bill.name}</p>
                    <Badge variant="secondary" className="text-[10px]">
                      {bill.category}
                    </Badge>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-right">
                    <span className="text-sm font-semibold text-orange-600 dark:text-orange-400">
                      -{formatCurrency(bill.amount, bill.currency)}
                    </span>
                    {bill.currency !== currency && (
                      <p className="text-[10px] text-zinc-400 dark:text-zinc-500">
                        ≈ {formatCurrency(convertToTarget(bill.amount, bill.currency, currency, exchangeRate), currency)}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => handleDeleteRecurring(bill.id)}
                    className="rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-red-500 dark:hover:bg-zinc-800"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}

            {recurringExpenses.length === 0 && (
              <p className="py-2 text-center text-sm text-zinc-400 dark:text-zinc-500">
                No fixed bills yet. Click &quot;Add Bill&quot; to track recurring costs.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-lg bg-orange-100 p-2.5 dark:bg-orange-900/30">
              <Repeat className="h-5 w-5 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Fixed Bills
              </p>
              <p className="text-xl font-bold text-orange-600 dark:text-orange-400">
                {formatCurrency(totalRecurring, currency)}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-lg bg-red-100 p-2.5 dark:bg-red-900/30">
              <CreditCard className="h-5 w-5 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Other Expenses
              </p>
              <p className="text-xl font-bold text-red-600 dark:text-red-400">
                {formatCurrency(totalExpenses, currency)}
              </p>
            </div>
          </CardContent>
        </Card>
        {totalCardPayments > 0 && (
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-lg bg-sky-100 p-2.5 dark:bg-sky-900/30">
              <Wallet className="h-5 w-5 text-sky-600 dark:text-sky-400" />
            </div>
            <div>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Card Payments
              </p>
              <p className="text-xl font-bold text-sky-600 dark:text-sky-400">
                {formatCurrency(totalCardPayments, currency)}
              </p>
            </div>
          </CardContent>
        </Card>
        )}
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className={`rounded-lg p-2.5 ${remaining >= 0 ? "bg-emerald-100 dark:bg-emerald-900/30" : "bg-red-100 dark:bg-red-900/30"}`}>
              <PiggyBank className={`h-5 w-5 ${remaining >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`} />
            </div>
            <div>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Remaining
              </p>
              <p className={`text-xl font-bold ${remaining >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                {formatCurrency(remaining, currency)}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className={`rounded-lg p-2.5 ${savingsRate >= 0 ? "bg-blue-100 dark:bg-blue-900/30" : "bg-amber-100 dark:bg-amber-900/30"}`}>
              <TrendingUp className={`h-5 w-5 ${savingsRate >= 0 ? "text-blue-600 dark:text-blue-400" : "text-amber-600 dark:text-amber-400"}`} />
            </div>
            <div>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Savings Rate
              </p>
              <p className={`text-xl font-bold ${savingsRate >= 0 ? "text-blue-600 dark:text-blue-400" : "text-amber-600 dark:text-amber-400"}`}>
                {savingsRate}%
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-lg bg-purple-100 p-2.5 dark:bg-purple-900/30">
              <Landmark className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Total Invested
              </p>
              <p className="text-xl font-bold text-purple-600 dark:text-purple-400">
                {formatCurrency(totalInvested, currency)}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Investments */}
      <Card className="border-purple-200 dark:border-purple-900/50">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Landmark className="h-5 w-5 text-purple-500" />
              Investments
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowInvestDialog(true)}
              className="gap-1.5"
            >
              <Plus className="h-3 w-3" />
              Add Investment
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Total invested highlight */}
          <div className="rounded-lg bg-purple-50 p-4 dark:bg-purple-900/20">
            <p className="text-sm font-medium text-purple-700 dark:text-purple-300">Total Invested</p>
            <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">
              {formatCurrency(totalInvested, currency)}
            </p>
            <p className="mt-0.5 text-xs text-purple-600/70 dark:text-purple-400/70">
              Across {investments.length} investment{investments.length !== 1 ? "s" : ""}
            </p>
          </div>

          {/* Investment list */}
          <div className="space-y-2">
            {investments.map((inv) => (
              <div
                key={inv.id}
                className="flex items-center justify-between rounded-lg border border-zinc-200 p-3 dark:border-zinc-800"
              >
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-purple-100 p-2 dark:bg-purple-900/30">
                    <Landmark className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{inv.name}</p>
                    <div className="flex items-center gap-2 text-xs text-zinc-400 dark:text-zinc-500">
                      <span>{inv.invested_at}</span>
                      {inv.notes && (
                        <>
                          <span>•</span>
                          <span className="truncate max-w-[200px]">{inv.notes}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-purple-600 dark:text-purple-400">
                    {formatCurrency(inv.amount, currency)}
                  </span>
                  <button
                    onClick={() => handleDeleteInvestment(inv.id)}
                    className="rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-red-500 dark:hover:bg-zinc-800"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}

            {investments.length === 0 && (
              <p className="py-2 text-center text-sm text-zinc-400 dark:text-zinc-500">
                No investments yet. Click &quot;Add Investment&quot; to start tracking.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Credit Cards */}
      <Card className="border-sky-200 dark:border-sky-900/50">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <CreditCard className="h-5 w-5 text-sky-500" />
              Credit Cards
            </CardTitle>
            <div className="flex gap-2">
              {creditCards.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowPaymentDialog(true)}
                  className="gap-1.5"
                >
                  <Wallet className="h-3 w-3" />
                  Log Payment
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowCardDialog(true)}
                className="gap-1.5"
              >
                <Plus className="h-3 w-3" />
                Add Card
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {creditCards.length > 0 ? (
            <div className="space-y-3">
              {creditCards.map((card) => {
                const crcInUsd = exchangeRate ? card.balance_crc / exchangeRate.venta : 0;
                const totalUsedUsd = card.balance_usd + crcInUsd;
                const utilization = card.credit_limit > 0 ? Math.round((totalUsedUsd / card.credit_limit) * 100) : 0;
                const barColor = utilization > 75 ? "bg-red-500" : utilization > 50 ? "bg-amber-500" : utilization > 30 ? "bg-sky-500" : "bg-emerald-500";
                const textColor = utilization > 75 ? "text-red-600 dark:text-red-400" : utilization > 50 ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400";
                const limitCrc = exchangeRate ? card.credit_limit * exchangeRate.venta : 0;
                const today = new Date().getDate();
                const daysUntilDue = card.due_date >= today ? card.due_date - today : (card.due_date + 30) - today;
                const dueColor = daysUntilDue <= 3 ? "text-red-600 dark:text-red-400" : daysUntilDue <= 7 ? "text-amber-600 dark:text-amber-400" : "text-zinc-500 dark:text-zinc-400";

                return (
                  <div key={card.id} className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="rounded-lg bg-sky-100 p-2 dark:bg-sky-900/30">
                          <CreditCard className="h-4 w-4 text-sky-600 dark:text-sky-400" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">{card.name}</p>
                          <p className="text-xs text-zinc-400 dark:text-zinc-500">•••• {card.last_four}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className={`text-[10px] ${dueColor}`}>
                          Due day {card.due_date} ({daysUntilDue}d)
                        </Badge>
                        <button
                          onClick={() => handleDeleteCard(card.id)}
                          className="rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-red-500 dark:hover:bg-zinc-800"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                    <div className="mb-2 flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
                      <span>Limit: {formatCurrency(card.credit_limit, "USD")} ≈ {formatCurrency(limitCrc, "CRC")}</span>
                      <span className={`font-semibold ${textColor}`}>{utilization}% used</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-zinc-100 dark:bg-zinc-800 mb-2">
                      <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${Math.min(100, utilization)}%` }} />
                    </div>
                    <div className="flex gap-4 text-[11px] text-zinc-400 dark:text-zinc-500">
                      {card.balance_crc > 0 && <span>₡ {formatCurrency(card.balance_crc, "CRC")}</span>}
                      {card.balance_usd > 0 && <span>$ {formatCurrency(card.balance_usd, "USD")}</span>}
                      {card.balance_crc === 0 && card.balance_usd === 0 && <span>No balance</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="py-2 text-center text-sm text-zinc-400 dark:text-zinc-500">
              No credit cards yet. Click &quot;Add Card&quot; to start tracking.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Card Payments Dashboard */}
      {cardPayments.length > 0 && (() => {
        const paymentsByCard = cardPayments.reduce((acc, p) => {
          const card = creditCards.find((c) => c.id === p.card_id);
          const label = card ? `${card.name} (${card.last_four})` : "Unknown";
          if (!acc[label]) acc[label] = { crc: 0, usd: 0 };
          if (p.currency === "USD") acc[label].usd += p.amount;
          else acc[label].crc += p.amount;
          return acc;
        }, {} as Record<string, { crc: number; usd: number }>);

        const pieData = Object.entries(paymentsByCard).map(([name, totals]) => ({
          name,
          value: totals.usd + (exchangeRate ? totals.crc / exchangeRate.venta : 0),
        }));
        const pieColors = ["#0ea5e9", "#8b5cf6", "#f59e0b", "#10b981", "#ef4444", "#ec4899"];

        return (
          <Card className="border-sky-200 dark:border-sky-900/50">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Wallet className="h-5 w-5 text-sky-500" />
                Card Payments This Month
              </CardTitle>
              <CardDescription>
                Total: {formatCurrency(totalCardPayments, currency)}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 md:grid-cols-2">
                <div className="h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {pieData.map((_, i) => (
                          <Cell key={i} fill={pieColors[i % pieColors.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value) => formatCurrency(Number(value), "USD")}
                        contentStyle={{
                          backgroundColor: "var(--color-zinc-50)",
                          border: "1px solid var(--color-zinc-200)",
                          borderRadius: "8px",
                          fontSize: "12px",
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-2.5">
                  {Object.entries(paymentsByCard).map(([label, totals], i) => (
                    <div key={label} className="flex items-center gap-3">
                      <div
                        className="h-3 w-3 rounded-full shrink-0"
                        style={{ backgroundColor: pieColors[i % pieColors.length] }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{label}</p>
                        <div className="flex gap-3 text-xs text-zinc-400 dark:text-zinc-500">
                          {totals.crc > 0 && <span>₡ {formatCurrency(totals.crc, "CRC")}</span>}
                          {totals.usd > 0 && <span>$ {formatCurrency(totals.usd, "USD")}</span>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })()}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Monthly Expenses Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-blue-500" />
              Monthly Expenses
            </CardTitle>
            <CardDescription>Spending over time</CardDescription>
          </CardHeader>
          <CardContent>
            {monthlyData.length > 0 ? (
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    className="stroke-zinc-200 dark:stroke-zinc-800"
                  />
                  <XAxis
                    dataKey="month"
                    tick={{ fill: "#a1a1aa", fontSize: 12 }}
                  />
                  <YAxis tick={{ fill: "#a1a1aa", fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "var(--background)",
                      border: "1px solid #e4e4e7",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                    formatter={(value) => formatCurrency(Number(value), currency)}
                  />
                  <Bar
                    dataKey="expenses"
                    fill="#ef4444"
                    radius={[4, 4, 0, 0]}
                    name="Expenses"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
            ) : (
              <p className="py-12 text-center text-sm text-zinc-400 dark:text-zinc-500">
                No expense data yet. Add transactions to see trends.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Spending by Category */}
        <Card>
          <CardHeader>
            <CardTitle>Spending by Category</CardTitle>
          </CardHeader>
          <CardContent>
            {pieData.length > 0 ? (
              <>
                <div className="h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {pieData.map((_, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={PIE_COLORS[index % PIE_COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value) => formatCurrency(Number(value), currency)}
                        contentStyle={{
                          backgroundColor: "var(--background)",
                          border: "1px solid #e4e4e7",
                          borderRadius: "8px",
                          fontSize: "12px",
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {pieData.map((item, i) => (
                    <div key={item.name} className="flex items-center gap-2 text-xs">
                      <div
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }}
                      />
                      <span className="text-zinc-600 dark:text-zinc-400 truncate">
                        {item.name}
                      </span>
                      <span className="ml-auto font-medium">
                        {formatCurrency(item.value, currency)}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <p className="py-12 text-center text-sm text-zinc-400 dark:text-zinc-500">
                No expenses yet. Add transactions to see categories.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Budget Progress */}
      {budgets.length > 0 && (
      <Card>
        <CardHeader>
          <CardTitle>Budget Progress</CardTitle>
          <CardDescription>Monthly budget targets</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {budgets.map((b) => ({
              category: b.category,
              budget: b.amount,
              spent: expensesByCategory[b.category] || 0,
            })).map((item) => (
              <div key={item.category}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="font-medium">{item.category}</span>
                  <span className="text-zinc-500 dark:text-zinc-400">
                    {formatCurrency(item.spent, currency)} / {formatCurrency(item.budget, currency)}
                  </span>
                </div>
                <Progress
                  value={item.spent}
                  max={item.budget}
                  indicatorClassName={
                    item.spent > item.budget ? "bg-red-500" : "bg-emerald-500"
                  }
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      )}

      {/* Recent Expenses */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Expenses</CardTitle>
        </CardHeader>
        <CardContent>
          {transactions.filter((t) => t.type === "expense").length > 0 ? (
            <div className="space-y-2">
              {transactions
                .filter((t) => t.type === "expense")
                .map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between rounded-lg border border-zinc-200 p-3 dark:border-zinc-800"
                >
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-red-100 p-2 dark:bg-red-900/30">
                      <ArrowDownRight className="h-4 w-4 text-red-600 dark:text-red-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{tx.description || tx.category}</p>
                      <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                        <span>{tx.category}</span>
                        <span>•</span>
                        <span>{tx.date}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <span className="text-sm font-semibold text-red-600 dark:text-red-400">
                        -{formatCurrency(tx.amount, tx.currency)}
                      </span>
                      {tx.currency !== currency && (
                        <p className="text-[10px] text-zinc-400 dark:text-zinc-500">
                          ≈ {formatCurrency(convertToTarget(tx.amount, tx.currency, currency, exchangeRate), currency)}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => handleDelete(tx.id)}
                      className="rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-red-500 dark:hover:bg-zinc-800"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="py-8 text-center text-sm text-zinc-400 dark:text-zinc-500">
              No expenses recorded yet. Click &quot;Add Expense&quot; to get started.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Currency Exchange Rate */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <ArrowRightLeft className="h-5 w-5 text-amber-500" />
                Currency Exchange
              </CardTitle>
              <CardDescription>
                CRC/USD rate from BCCR (Banco Central de Costa Rica)
              </CardDescription>
            </div>
            <button
              onClick={fetchExchangeRate}
              disabled={rateLoading}
              className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300 disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${rateLoading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </CardHeader>
        <CardContent>
          {rateError ? (
            <p className="text-sm text-red-500">{rateError}</p>
          ) : rateLoading ? (
            <div className="space-y-3">
              <div className="h-16 animate-pulse rounded-lg bg-zinc-100 dark:bg-zinc-800" />
              <div className="h-10 animate-pulse rounded-lg bg-zinc-100 dark:bg-zinc-800" />
            </div>
          ) : exchangeRate ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
                  <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Buy (Compra)</p>
                  <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                    ₡{exchangeRate.compra.toFixed(2)}
                  </p>
                  <p className="text-xs text-zinc-400 dark:text-zinc-500">per 1 USD</p>
                </div>
                <div className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
                  <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Sell (Venta)</p>
                  <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
                    ₡{exchangeRate.venta.toFixed(2)}
                  </p>
                  <p className="text-xs text-zinc-400 dark:text-zinc-500">per 1 USD</p>
                </div>
              </div>
              <div className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                      {convertDirection === "crc-to-usd" ? "CRC (Colones)" : "USD (Dollars)"}
                    </label>
                    <Input
                      type="number"
                      placeholder="0.00"
                      value={convertAmount}
                      onChange={(e) => setConvertAmount(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <button
                    onClick={() =>
                      setConvertDirection((d) =>
                        d === "crc-to-usd" ? "usd-to-crc" : "crc-to-usd"
                      )
                    }
                    className="mt-5 rounded-lg border border-zinc-200 p-2 text-zinc-500 hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
                  >
                    <ArrowRightLeft className="h-4 w-4" />
                  </button>
                  <div className="flex-1">
                    <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                      {convertDirection === "crc-to-usd" ? "USD (Dollars)" : "CRC (Colones)"}
                    </label>
                    <div className="mt-1 flex h-9 items-center rounded-md border border-zinc-200 bg-zinc-50 px-3 text-sm font-medium dark:border-zinc-800 dark:bg-zinc-900">
                      {convertedAmount !== null
                        ? convertDirection === "crc-to-usd"
                          ? `$${convertedAmount.toFixed(2)}`
                          : `₡${convertedAmount.toFixed(2)}`
                        : "—"}
                    </div>
                  </div>
                </div>
                <p className="mt-2 text-[11px] text-zinc-400 dark:text-zinc-500">
                  Uses {convertDirection === "crc-to-usd" ? "buy" : "sell"} rate
                  &middot; Updated {exchangeRate.updated}
                </p>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* Add Expense Dialog */}
      <Dialog open={showDialog} onClose={() => setShowDialog(false)}>
        <DialogHeader>
          <DialogTitle>Add Expense</DialogTitle>
        </DialogHeader>
        <div className="mt-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium">Amount</label>
              <Input
                type="number"
                placeholder="0.00"
                value={newTx.amount}
                onChange={(e) => setNewTx({ ...newTx, amount: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Currency</label>
              <Select
                value={newTx.currency}
                onChange={(e) => setNewTx({ ...newTx, currency: e.target.value })}
                className="mt-1"
              >
                {CURRENCIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.symbol} {c.code}
                  </option>
                ))}
              </Select>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium">Category</label>
            <Select
              value={newTx.category}
              onChange={(e) =>
                setNewTx({ ...newTx, category: e.target.value })
              }
              className="mt-1"
            >
              {expenseCategories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium">Description</label>
            <Input
              placeholder="What was this for?"
              value={newTx.description}
              onChange={(e) =>
                setNewTx({ ...newTx, description: e.target.value })
              }
              className="mt-1"
            />
          </div>
          {creditCards.length > 0 && (
            <div>
              <label className="text-sm font-medium">Paid With (optional)</label>
              <Select
                value={newTx.cardId}
                onChange={(e) => setNewTx({ ...newTx, cardId: e.target.value })}
                className="mt-1"
              >
                <option value="">Cash / Debit</option>
                {creditCards.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} (•••• {c.last_four})
                  </option>
                ))}
              </Select>
            </div>
          )}
          {newTx.currency !== currency && exchangeRate && (
            <p className="text-xs text-zinc-400 dark:text-zinc-500">
              Will be converted to {currency} using current exchange rate for totals
            </p>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddTransaction}>Save</Button>
          </div>
        </div>
      </Dialog>

      {/* Edit Income Dialog */}
      <Dialog open={showIncomeDialog} onClose={() => setShowIncomeDialog(false)}>
        <DialogHeader>
          <DialogTitle>Update Monthly Income</DialogTitle>
        </DialogHeader>
        <div className="mt-4 space-y-4">
          {incomeError && (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
              {incomeError}
            </div>
          )}
          <div>
            <label className="text-sm font-medium">Monthly Income</label>
            <Input
              type="number"
              placeholder="0"
              min={0}
              step="0.01"
              value={newIncome}
              onChange={(e) => setNewIncome(e.target.value)}
              className="mt-1"
            />
            <p className="mt-1.5 text-xs text-zinc-400 dark:text-zinc-500">
              Currency: {CURRENCIES.find((c) => c.code === incomeCurrency)?.name ?? incomeCurrency}
            </p>
          </div>
          <div className="rounded-lg bg-amber-50 p-3 text-xs text-amber-700 dark:bg-amber-900/20 dark:text-amber-400">
            <Lock className="mr-1 inline h-3 w-3" />
            After saving, you won&apos;t be able to change this for 30 days.
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setShowIncomeDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateIncome}>Save Income</Button>
          </div>
        </div>
      </Dialog>

      {/* Add Income Source Dialog */}
      <Dialog open={showSourceDialog} onClose={() => setShowSourceDialog(false)}>
        <DialogHeader>
          <DialogTitle>Add Income Source</DialogTitle>
        </DialogHeader>
        <div className="mt-4 space-y-4">
          <div>
            <label className="text-sm font-medium">Source Name</label>
            <Input
              placeholder="e.g. Freelance, Side Hustle, Rental Income"
              value={newSource.name}
              onChange={(e) => setNewSource({ ...newSource, name: e.target.value })}
              className="mt-1"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Amount</label>
            <Input
              type="number"
              placeholder="0"
              min={0}
              step="0.01"
              value={newSource.amount}
              onChange={(e) => setNewSource({ ...newSource, amount: e.target.value })}
              className="mt-1"
            />
            <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">
              In {CURRENCIES.find((c) => c.code === incomeCurrency)?.name ?? incomeCurrency}
            </p>
          </div>
          <div>
            <label className="text-sm font-medium">Frequency</label>
            <Select
              value={newSource.frequency}
              onChange={(e) => setNewSource({ ...newSource, frequency: e.target.value as "monthly" | "one-time" })}
              className="mt-1"
            >
              <option value="monthly">Monthly (recurring)</option>
              <option value="one-time">One-time</option>
            </Select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setShowSourceDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddSource}>Add Source</Button>
          </div>
        </div>
      </Dialog>

      {/* Add Recurring Expense Dialog */}
      <Dialog open={showRecurringDialog} onClose={() => setShowRecurringDialog(false)}>
        <DialogHeader>
          <DialogTitle>Add Fixed Monthly Bill</DialogTitle>
        </DialogHeader>
        <div className="mt-4 space-y-4">
          <div>
            <label className="text-sm font-medium">Bill Name</label>
            <Input
              placeholder="e.g. Rent, Netflix, Insurance"
              value={newRecurring.name}
              onChange={(e) => setNewRecurring({ ...newRecurring, name: e.target.value })}
              className="mt-1"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium">Monthly Amount</label>
              <Input
                type="number"
                placeholder="0"
                min={0}
                step="0.01"
                value={newRecurring.amount}
                onChange={(e) => setNewRecurring({ ...newRecurring, amount: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Currency</label>
              <Select
                value={newRecurring.currency}
                onChange={(e) => setNewRecurring({ ...newRecurring, currency: e.target.value })}
                className="mt-1"
              >
                {CURRENCIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.symbol} {c.code}
                  </option>
                ))}
              </Select>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium">Category</label>
            <Select
              value={newRecurring.category}
              onChange={(e) => setNewRecurring({ ...newRecurring, category: e.target.value })}
              className="mt-1"
            >
              {expenseCategories.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </Select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setShowRecurringDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddRecurring}>Add Bill</Button>
          </div>
        </div>
      </Dialog>

      {/* Add Investment Dialog */}
      <Dialog open={showInvestDialog} onClose={() => setShowInvestDialog(false)}>
        <DialogHeader>
          <DialogTitle>Add Investment</DialogTitle>
        </DialogHeader>
        <div className="mt-4 space-y-4">
          <div>
            <label className="text-sm font-medium">Investment Name</label>
            <Input
              placeholder="e.g. S&P 500, Bitcoin, Savings Bond"
              value={newInvest.name}
              onChange={(e) => setNewInvest({ ...newInvest, name: e.target.value })}
              className="mt-1"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Amount</label>
            <Input
              type="number"
              placeholder="0"
              min={0}
              step="0.01"
              value={newInvest.amount}
              onChange={(e) => setNewInvest({ ...newInvest, amount: e.target.value })}
              className="mt-1"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Notes (optional)</label>
            <Input
              placeholder="e.g. Monthly DCA, Lump sum"
              value={newInvest.notes}
              onChange={(e) => setNewInvest({ ...newInvest, notes: e.target.value })}
              className="mt-1"
            />
          </div>
          <div className="rounded-lg bg-purple-50 p-3 text-xs text-purple-700 dark:bg-purple-900/20 dark:text-purple-400">
            <Landmark className="mr-1 inline h-3 w-3" />
            This reduces your remaining income but won&apos;t count as an expense.
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setShowInvestDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddInvestment}>Add Investment</Button>
          </div>
        </div>
      </Dialog>

      {/* Add Credit Card Dialog */}
      <Dialog open={showCardDialog} onClose={() => setShowCardDialog(false)}>
        <DialogHeader>
          <DialogTitle>Add Credit Card</DialogTitle>
        </DialogHeader>
        <div className="mt-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium">Card Name</label>
              <Input
                placeholder="e.g. Visa Gold"
                value={newCard.name}
                onChange={(e) => setNewCard({ ...newCard, name: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Last 4 Digits</label>
              <Input
                placeholder="1234"
                maxLength={4}
                value={newCard.last_four}
                onChange={(e) => setNewCard({ ...newCard, last_four: e.target.value.replace(/\D/g, "").slice(0, 4) })}
                className="mt-1"
              />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium">Credit Limit (USD)</label>
            <Input
              type="number"
              placeholder="0"
              min={0}
              value={newCard.credit_limit}
              onChange={(e) => setNewCard({ ...newCard, credit_limit: e.target.value })}
              className="mt-1"
            />
            {newCard.credit_limit && exchangeRate && (
              <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">
                ≈ {formatCurrency(Number(newCard.credit_limit) * exchangeRate.venta, "CRC")} CRC
              </p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium">Current CRC Balance</label>
              <Input
                type="number"
                placeholder="0"
                min={0}
                step="0.01"
                value={newCard.balance_crc}
                onChange={(e) => setNewCard({ ...newCard, balance_crc: e.target.value })}
                className="mt-1"
              />
              <p className="mt-0.5 text-[10px] text-zinc-400">Amount owed in ₡</p>
            </div>
            <div>
              <label className="text-sm font-medium">Current USD Balance</label>
              <Input
                type="number"
                placeholder="0"
                min={0}
                step="0.01"
                value={newCard.balance_usd}
                onChange={(e) => setNewCard({ ...newCard, balance_usd: e.target.value })}
                className="mt-1"
              />
              <p className="mt-0.5 text-[10px] text-zinc-400">Amount owed in $</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium">Billing Day</label>
              <Input
                type="number"
                min={1}
                max={31}
                value={newCard.billing_date}
                onChange={(e) => setNewCard({ ...newCard, billing_date: e.target.value })}
                className="mt-1"
              />
              <p className="mt-0.5 text-[10px] text-zinc-400">Day of month</p>
            </div>
            <div>
              <label className="text-sm font-medium">Due Day</label>
              <Input
                type="number"
                min={1}
                max={31}
                value={newCard.due_date}
                onChange={(e) => setNewCard({ ...newCard, due_date: e.target.value })}
                className="mt-1"
              />
              <p className="mt-0.5 text-[10px] text-zinc-400">Payment due day</p>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setShowCardDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddCard}>Add Card</Button>
          </div>
        </div>
      </Dialog>

      {/* Log Payment Dialog */}
      <Dialog open={showPaymentDialog} onClose={() => { setShowPaymentDialog(false); setPaymentCardId(null); setPaymentAmount(""); setPaymentCurrency("CRC"); }}>
        <DialogHeader>
          <DialogTitle>Log Card Payment</DialogTitle>
        </DialogHeader>
        <div className="mt-4 space-y-4">
          <div>
            <label className="text-sm font-medium">Select Card</label>
            <Select
              value={paymentCardId ?? ""}
              onChange={(e) => setPaymentCardId(e.target.value || null)}
              className="mt-1"
            >
              <option value="">Choose a card...</option>
              {creditCards.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} (•••• {c.last_four})
                </option>
              ))}
            </Select>
          </div>
          {paymentCardId && (() => {
            const sel = creditCards.find((c) => c.id === paymentCardId);
            if (!sel) return null;
            return (
              <div className="rounded-lg border border-zinc-200 p-3 text-xs dark:border-zinc-800 space-y-0.5">
                <p className="text-zinc-500 dark:text-zinc-400">CRC balance: {formatCurrency(sel.balance_crc, "CRC")}</p>
                <p className="text-zinc-500 dark:text-zinc-400">USD balance: {formatCurrency(sel.balance_usd, "USD")}</p>
                <p className="text-zinc-400 dark:text-zinc-500">Limit: {formatCurrency(sel.credit_limit, "USD")}</p>
              </div>
            );
          })()}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium">Payment Amount</label>
              <Input
                type="number"
                placeholder="0"
                min={0}
                step="0.01"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Currency</label>
              <Select
                value={paymentCurrency}
                onChange={(e) => setPaymentCurrency(e.target.value as "CRC" | "USD")}
                className="mt-1"
              >
                <option value="CRC">₡ CRC</option>
                <option value="USD">$ USD</option>
              </Select>
            </div>
          </div>
          <div className="rounded-lg bg-sky-50 p-3 text-xs text-sky-700 dark:bg-sky-900/20 dark:text-sky-400">
            <Wallet className="mr-1 inline h-3 w-3" />
            This reduces your card&apos;s {paymentCurrency} balance. The expense was already counted when you logged it.
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => { setShowPaymentDialog(false); setPaymentCardId(null); setPaymentAmount(""); setPaymentCurrency("CRC"); }}>
              Cancel
            </Button>
            <Button onClick={handleLogPayment} disabled={!paymentCardId || !paymentAmount}>
              Log Payment
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
