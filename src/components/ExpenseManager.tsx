"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { formatCents, inPeriod, type PeriodKey } from "@/lib/calculations";
import { readStoredPeriod, writeStoredPeriod } from "@/lib/periodPreference";

const inputClass =
  "w-full rounded-[14px] border border-line bg-card px-3.5 py-2.5 text-sm text-fg placeholder:text-muted transition-ui focus:border-gold focus:outline-none focus:ring-4 focus:ring-gold/[.22]";
const labelClass = "mb-1.5 block text-xs font-medium text-muted";

const CATEGORIES = ["Grading", "Shipping", "Supplies", "Inventory", "Fees", "Travel", "Software", "Other"];

const PERIODS: { key: PeriodKey; label: string }[] = [
  { key: "MONTH", label: "This Month" },
  { key: "YTD", label: "YTD" },
  { key: "ALL", label: "All-Time" },
];

export interface ExpenseRow {
  id: string;
  date: string;
  category: string;
  description: string;
  amount: number;
  card: { id: string; player: string } | null;
}

type ExpenseFormValues = {
  date: string;
  category: string;
  description: string;
  amount: string;
  cardId: string;
};

const emptyForm: ExpenseFormValues = {
  date: new Date().toISOString().slice(0, 10),
  category: "Supplies",
  description: "",
  amount: "",
  cardId: "",
};

function ExpenseFields({
  form,
  setForm,
  cardOptions,
}: {
  form: ExpenseFormValues;
  setForm: (updater: (f: ExpenseFormValues) => ExpenseFormValues) => void;
  cardOptions: { id: string; player: string }[];
}) {
  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className={labelClass}>Date *</label>
          <input
            required
            type="date"
            className={inputClass}
            value={form.date}
            onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
          />
        </div>
        <div>
          <label className={labelClass}>Category</label>
          <select className={inputClass} value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <label className={labelClass}>Description *</label>
        <input
          required
          className={inputClass}
          value={form.description}
          onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          placeholder="Monthly pricing app subscription"
        />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className={labelClass}>Amount ($) *</label>
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
        <div>
          <label className={labelClass}>Link to a Card (optional)</label>
          <select className={inputClass} value={form.cardId} onChange={(e) => setForm((f) => ({ ...f, cardId: e.target.value }))}>
            <option value="">General expense</option>
            {cardOptions.map((c) => (
              <option key={c.id} value={c.id}>{c.player}</option>
            ))}
          </select>
        </div>
      </div>
    </>
  );
}

export function ExpenseManager({
  expenses,
  cardOptions,
}: {
  expenses: ExpenseRow[];
  cardOptions: { id: string; player: string }[];
}) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [periodFilter, setPeriodFilterState] = useState<PeriodKey>("MONTH");
  const [form, setForm] = useState<ExpenseFormValues>(emptyForm);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<ExpenseFormValues>(emptyForm);
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Defaults to whatever period is currently toggled on the Dashboard (and
  // vice versa) so this list starts scoped instead of showing everything.
  useEffect(() => setPeriodFilterState(readStoredPeriod()), []);

  function setPeriodFilter(next: PeriodKey) {
    setPeriodFilterState(next);
    writeStoredPeriod(next);
  }

  const filtered = useMemo(() => {
    const now = new Date();
    return expenses
      .filter((e) => categoryFilter === "ALL" || e.category === categoryFilter)
      .filter((e) => inPeriod(e.date, periodFilter, now));
  }, [expenses, categoryFilter, periodFilter]);

  const total = filtered.reduce((sum, e) => sum + e.amount, 0);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch("/api/expenses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, cardId: form.cardId || null }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Failed to add expense");
      return;
    }
    setForm(emptyForm);
    setAdding(false);
    router.refresh();
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this expense?")) return;
    const res = await fetch(`/api/expenses/${id}`, { method: "DELETE" });
    if (res.ok) router.refresh();
  }

  function openEdit(expense: ExpenseRow) {
    setEditingId(expense.id);
    setEditError(null);
    setEditForm({
      date: expense.date.slice(0, 10),
      category: expense.category,
      description: expense.description,
      amount: (expense.amount / 100).toString(),
      cardId: expense.card?.id ?? "",
    });
  }

  async function handleSaveEdit(e: React.FormEvent, id: string) {
    e.preventDefault();
    setEditLoading(true);
    setEditError(null);
    const res = await fetch(`/api/expenses/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...editForm, cardId: editForm.cardId || null }),
    });
    setEditLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setEditError(data.error ?? "Failed to save changes");
      return;
    }
    setEditingId(null);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="seg">
          {PERIODS.map((p) => (
            <button
              key={p.key}
              onClick={() => setPeriodFilter(p.key)}
              className={
                "seg-tab " +
                (periodFilter === p.key ? "seg-tab-on" : "")
              }
            >
              {p.label}
            </button>
          ))}
        </div>
        <button
          onClick={() => setAdding((a) => !a)}
          className="btn-gold"
        >
          {adding ? "Cancel" : "+ Add Expense"}
        </button>
      </div>

      <div className="seg">
        {["ALL", ...CATEGORIES].map((c) => (
          <button
            key={c}
            onClick={() => setCategoryFilter(c)}
            className={
              "seg-tab " +
              (categoryFilter === c ? "seg-tab-on" : "")
            }
          >
            {c === "ALL" ? "All" : c}
          </button>
        ))}
      </div>

      {adding && (
        <form onSubmit={handleAdd} className="space-y-4 card p-6">
          <ExpenseFields form={form} setForm={setForm} cardOptions={cardOptions} />
          {error && <p className="text-sm text-bad-text">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="btn-gold disabled:opacity-50"
          >
            {loading ? "Saving..." : "Add Expense"}
          </button>
        </form>
      )}

      <div className="card">
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 className="font-display text-base font-bold tracking-tight text-fg">
            {categoryFilter === "ALL" ? "All Expenses" : categoryFilter} ·{" "}
            {PERIODS.find((p) => p.key === periodFilter)?.label} ({filtered.length})
          </h2>
          <p className="tabular-nums text-sm text-fg">{formatCents(total)}</p>
        </div>
        {filtered.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-muted">
            {expenses.length === 0 ? "No expenses recorded yet." : "No expenses match this filter."}
          </p>
        ) : (
          <ul className="divide-y divide-line">
            {filtered.map((e) =>
              editingId === e.id ? (
                <li key={e.id} className="px-5 py-4">
                  <form onSubmit={(evt) => handleSaveEdit(evt, e.id)} className="space-y-4">
                    <ExpenseFields form={editForm} setForm={setEditForm} cardOptions={cardOptions} />
                    {editError && <p className="text-sm text-bad-text">{editError}</p>}
                    <div className="flex gap-2">
                      <button
                        type="submit"
                        disabled={editLoading}
                        className="btn-gold btn-sm disabled:opacity-50"
                      >
                        {editLoading ? "Saving..." : "Save"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        className="btn-ghost btn-sm"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                </li>
              ) : (
                <li key={e.id} className="flex flex-col gap-2 px-5 py-3.5 transition-ui hover:bg-gold/[.05] sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm text-fg">{e.description}</p>
                    <p className="text-xs text-muted">
                      {e.category} ·{" "}
                      {new Date(e.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" })}
                      {e.card && (
                        <>
                          {" · "}
                          <Link href={`/inventory/${e.card.id}`} className="text-gold-text hover:underline">
                            {e.card.player}
                          </Link>
                        </>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="tabular-nums text-sm text-fg">{formatCents(e.amount)}</span>
                    <button onClick={() => openEdit(e)} className="text-xs font-semibold text-gold-text hover:underline">
                      Edit
                    </button>
                    <button onClick={() => handleDelete(e.id)} className="text-xs font-semibold text-bad-text hover:underline">
                      Remove
                    </button>
                  </div>
                </li>
              )
            )}
          </ul>
        )}
      </div>
    </div>
  );
}
