"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatCents } from "@/lib/calculations";

const inputClass =
  "w-full rounded-[14px] border border-line bg-card px-3.5 py-2.5 text-sm text-fg placeholder:text-muted transition-ui focus:border-gold focus:outline-none focus:ring-4 focus:ring-gold/[.22]";
const labelClass = "mb-1.5 block text-xs font-medium text-muted";

const CATEGORIES = ["Grading", "Shipping", "Supplies", "Inventory", "Fees", "Travel", "Software", "Other"];

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
    <div className="card p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-display text-base font-bold tracking-tight text-fg">Linked Expenses</h2>
        <button onClick={() => setAdding((a) => !a)} className="text-xs font-semibold text-gold-text hover:underline">
          {adding ? "Cancel" : "+ Add Expense"}
        </button>
      </div>

      {adding && (
        <form onSubmit={handleAdd} className="mb-4 space-y-3 rounded-2xl border border-line bg-inset p-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
          {error && <p className="text-sm text-bad-text">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="btn-gold btn-sm disabled:opacity-50"
          >
            {loading ? "Saving..." : "Add"}
          </button>
        </form>
      )}

      {expenses.length === 0 ? (
        <p className="text-sm text-muted">No expenses linked to this card yet.</p>
      ) : (
        <ul className="divide-y divide-line">
          {expenses.map((e) => (
            <li key={e.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-fg">{e.description}</p>
                <p className="text-xs text-muted">
                  {e.category} ·{" "}
                  {new Date(e.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" })}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="tabular-nums text-sm text-fg">{formatCents(e.amount)}</span>
                <button onClick={() => handleDelete(e.id)} className="text-xs font-semibold text-bad-text hover:underline">
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
