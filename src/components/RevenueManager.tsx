"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { formatCents, inPeriod, type PeriodKey } from "@/lib/calculations";
import { readStoredPeriod, writeStoredPeriod } from "@/lib/periodPreference";

const inputClass =
  "w-full rounded-[14px] border border-line bg-card px-3.5 py-2.5 text-sm text-fg placeholder:text-muted transition-ui focus:border-gold focus:outline-none focus:ring-4 focus:ring-gold/[.22]";
const labelClass = "mb-1.5 block text-xs font-medium text-muted";

const CATEGORIES = ["Card Sale", "Lot Sale", "Shipping", "Owner Contribution", "Other"];

const PERIODS: { key: PeriodKey; label: string }[] = [
  { key: "MONTH", label: "This Month" },
  { key: "YTD", label: "YTD" },
  { key: "ALL", label: "All-Time" },
];

export interface RevenueRow {
  id: string;
  date: string;
  category: string;
  description: string;
  amount: number;
  card: { id: string; player: string } | null;
}

type RevenueFormValues = {
  date: string;
  category: string;
  description: string;
  amount: string;
  cardId: string;
};

const emptyForm: RevenueFormValues = {
  date: new Date().toISOString().slice(0, 10),
  category: "Card Sale",
  description: "",
  amount: "",
  cardId: "",
};

function RevenueFields({
  form,
  setForm,
  cardOptions,
}: {
  form: RevenueFormValues;
  setForm: (updater: (f: RevenueFormValues) => RevenueFormValues) => void;
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
          {form.category === "Owner Contribution" && (
            <p className="mt-1.5 text-xs text-muted">Tracked here, but excluded from Total Revenue and Net P&L on the dashboard.</p>
          )}
        </div>
      </div>
      <div>
        <label className={labelClass}>Description *</label>
        <input
          required
          className={inputClass}
          value={form.description}
          onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          placeholder="Sold 2023 Prizm Wembanyama PSA 10"
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
            <option value="">General revenue</option>
            {cardOptions.map((c) => (
              <option key={c.id} value={c.id}>{c.player}</option>
            ))}
          </select>
        </div>
      </div>
    </>
  );
}

export function RevenueManager({
  revenue,
  cardOptions,
}: {
  revenue: RevenueRow[];
  cardOptions: { id: string; player: string }[];
}) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [periodFilter, setPeriodFilterState] = useState<PeriodKey>("MONTH");
  const [form, setForm] = useState<RevenueFormValues>(emptyForm);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<RevenueFormValues>(emptyForm);
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
    return revenue
      .filter((r) => categoryFilter === "ALL" || r.category === categoryFilter)
      .filter((r) => inPeriod(r.date, periodFilter, now));
  }, [revenue, categoryFilter, periodFilter]);

  const total = filtered.reduce((sum, r) => sum + r.amount, 0);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch("/api/revenue", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, cardId: form.cardId || null }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Failed to add revenue");
      return;
    }
    setForm(emptyForm);
    setAdding(false);
    router.refresh();
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this revenue entry?")) return;
    const res = await fetch(`/api/revenue/${id}`, { method: "DELETE" });
    if (res.ok) router.refresh();
  }

  function openEdit(entry: RevenueRow) {
    setEditingId(entry.id);
    setEditError(null);
    setEditForm({
      date: entry.date.slice(0, 10),
      category: entry.category,
      description: entry.description,
      amount: (entry.amount / 100).toString(),
      cardId: entry.card?.id ?? "",
    });
  }

  async function handleSaveEdit(e: React.FormEvent, id: string) {
    e.preventDefault();
    setEditLoading(true);
    setEditError(null);
    const res = await fetch(`/api/revenue/${id}`, {
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
          {adding ? "Cancel" : "+ Add Revenue"}
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
          <RevenueFields form={form} setForm={setForm} cardOptions={cardOptions} />
          {error && <p className="text-sm text-bad-text">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="btn-gold disabled:opacity-50"
          >
            {loading ? "Saving..." : "Add Revenue"}
          </button>
        </form>
      )}

      <div className="card">
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 className="font-display text-base font-bold tracking-tight text-fg">
            {categoryFilter === "ALL" ? "All Revenue" : categoryFilter} ·{" "}
            {PERIODS.find((p) => p.key === periodFilter)?.label} ({filtered.length})
          </h2>
          <p className="tabular-nums text-sm text-fg">{formatCents(total)}</p>
        </div>
        {filtered.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-muted">
            {revenue.length === 0 ? "No revenue recorded yet." : "No revenue matches this filter."}
          </p>
        ) : (
          <ul className="divide-y divide-line">
            {filtered.map((r) =>
              editingId === r.id ? (
                <li key={r.id} className="px-5 py-4">
                  <form onSubmit={(evt) => handleSaveEdit(evt, r.id)} className="space-y-4">
                    <RevenueFields form={editForm} setForm={setEditForm} cardOptions={cardOptions} />
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
                <li key={r.id} className="flex flex-col gap-2 px-5 py-3.5 transition-ui hover:bg-gold/[.05] sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm text-fg">{r.description}</p>
                    <p className="text-xs text-muted">
                      {r.category} ·{" "}
                      {new Date(r.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" })}
                      {r.card && (
                        <>
                          {" · "}
                          <Link href={`/inventory/${r.card.id}`} className="text-gold-text hover:underline">
                            {r.card.player}
                          </Link>
                        </>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="tabular-nums text-sm text-fg">{formatCents(r.amount)}</span>
                    <button onClick={() => openEdit(r)} className="text-xs font-semibold text-gold-text hover:underline">
                      Edit
                    </button>
                    <button onClick={() => handleDelete(r.id)} className="text-xs font-semibold text-bad-text hover:underline">
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
