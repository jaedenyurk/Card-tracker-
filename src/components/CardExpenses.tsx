"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatCents } from "@/lib/calculations";

const inputClass =
  "w-full rounded-lg border border-white/10 bg-base-850 px-3 py-2 text-sm text-white placeholder:text-muted focus:border-accent focus:outline-none";
const labelClass = "mb-1.5 block text-xs font-medium text-muted";

const CATEGORIES = ["Grading", "Shipping", "Supplies", "Fees", "Travel", "Software", "Other"];

interface ExpenseItem {
  id: string;
  date: string;
  category: string;
  description: string;
  amount: number;
}

export function CardExpenses({ cardId, expenses }: { cardId: string; expenses: ExpenseItem[] }) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    category: "Grading",
    description: "",
    amount: "",
  });

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch("/api/expenses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, cardId }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Failed to add expense");
      return;
    }
    setForm({ date: new Date().toISOString().slice(0, 10), category: "Grading", description: "", amount: "" });
    setAdding(false);
    router.refresh();
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this expense?")) return;
    const res = await fetch(`/api/expenses/${id}`, { method: "DELETE" });
    if (res.ok) router.refresh();
  }

  return (
    <div className="rounded-xl border border-white/5 bg-base-900 p-5 shadow-panel">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-white">Linked Expenses</h2>
        <button onClick={() => setAdding((a) => !a)} className="text-xs text-accent hover:underline">
          {adding ? "Cancel" : "+ Add Expense"}
        </button>
      </div>

      {adding && (
        <form onSubmit={handleAdd} className="mb-4 space-y-3 rounded-lg border border-white/10 p-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Date</label>
              <input
                type="date"
                required
                className={inputClass}
                value={form.date}
                onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
              />
            </div>
            <div>
              <label className={labelClass}>Category</label>
              <select
                className={inputClass}
                value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className={labelClass}>Description</label>
            <input
              required
              className={inputClass}
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="PSA grading submission"
            />
          </div>
          <div>
            <label className={labelClass}>Amount ($)</label>
            <input
              required
              type="number"
              step="0.01"
              min="0"
              className={inputClass}
              value={form.amount}
              onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
              placeholder="0.00"
            />
          </div>
          {error && <p className="text-sm text-loss">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-accent px-3 py-2 text-sm font-medium text-white transition hover:bg-accent-soft disabled:opacity-50"
          >
            {loading ? "Saving..." : "Add"}
          </button>
        </form>
      )}

      {expenses.length === 0 ? (
        <p className="text-sm text-muted">No expenses linked to this card yet.</p>
      ) : (
        <ul className="divide-y divide-white/5">
          {expenses.map((e) => (
            <li key={e.id} className="flex items-center justify-between py-2.5">
              <div>
                <p className="text-sm text-white">{e.description}</p>
                <p className="text-xs text-muted">
                  {e.category} ·{" "}
                  {new Date(e.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" })}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-mono text-sm text-white">{formatCents(e.amount)}</span>
                <button onClick={() => handleDelete(e.id)} className="text-xs text-loss hover:underline">
                  Remove
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
