"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { formatCents } from "@/lib/calculations";

const inputClass =
  "w-full rounded-lg border border-white/10 bg-base-850 px-3 py-2 text-sm text-white placeholder:text-muted focus:border-accent focus:outline-none";
const labelClass = "mb-1.5 block text-xs font-medium text-muted";

const CATEGORIES = ["Card Sale", "Lot Sale", "Shipping", "Other"];

export interface RevenueRow {
  id: string;
  date: string;
  category: string;
  description: string;
  amount: number;
  card: { id: string; player: string } | null;
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
  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    category: "Card Sale",
    description: "",
    amount: "",
    cardId: "",
  });

  const filtered = useMemo(
    () => (categoryFilter === "ALL" ? revenue : revenue.filter((r) => r.category === categoryFilter)),
    [revenue, categoryFilter]
  );

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
    setForm({ date: new Date().toISOString().slice(0, 10), category: "Card Sale", description: "", amount: "", cardId: "" });
    setAdding(false);
    router.refresh();
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this revenue entry?")) return;
    const res = await fetch(`/api/revenue/${id}`, { method: "DELETE" });
    if (res.ok) router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1 rounded-lg border border-white/10 bg-base-850 p-0.5 text-xs">
          {["ALL", ...CATEGORIES].map((c) => (
            <button
              key={c}
              onClick={() => setCategoryFilter(c)}
              className={
                "rounded-md px-3 py-1 transition " +
                (categoryFilter === c ? "bg-accent text-white" : "text-muted hover:text-white")
              }
            >
              {c === "ALL" ? "All" : c}
            </button>
          ))}
        </div>
        <button
          onClick={() => setAdding((a) => !a)}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition hover:bg-accent-soft"
        >
          {adding ? "Cancel" : "+ Add Revenue"}
        </button>
      </div>

      {adding && (
        <form onSubmit={handleAdd} className="space-y-4 rounded-xl border border-white/5 bg-base-900 p-5 shadow-panel">
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
              <select
                className={inputClass}
                value={form.cardId}
                onChange={(e) => setForm((f) => ({ ...f, cardId: e.target.value }))}
              >
                <option value="">General revenue</option>
                {cardOptions.map((c) => (
                  <option key={c.id} value={c.id}>{c.player}</option>
                ))}
              </select>
            </div>
          </div>
          {error && <p className="text-sm text-loss">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition hover:bg-accent-soft disabled:opacity-50"
          >
            {loading ? "Saving..." : "Add Revenue"}
          </button>
        </form>
      )}

      <div className="rounded-xl border border-white/5 bg-base-900 shadow-panel">
        <div className="flex items-center justify-between border-b border-white/5 px-5 py-4">
          <h2 className="text-sm font-semibold text-white">
            {categoryFilter === "ALL" ? "All Revenue" : categoryFilter} ({filtered.length})
          </h2>
          <p className="font-mono text-sm text-white">{formatCents(total)}</p>
        </div>
        {filtered.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-muted">No revenue recorded yet.</p>
        ) : (
          <ul className="divide-y divide-white/5">
            {filtered.map((r) => (
              <li key={r.id} className="flex items-center justify-between px-5 py-3">
                <div>
                  <p className="text-sm text-white">{r.description}</p>
                  <p className="text-xs text-muted">
                    {r.category} ·{" "}
                    {new Date(r.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" })}
                    {r.card && (
                      <>
                        {" · "}
                        <Link href={`/inventory/${r.card.id}`} className="text-accent hover:underline">
                          {r.card.player}
                        </Link>
                      </>
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <span className="font-mono text-sm text-white">{formatCents(r.amount)}</span>
                  <button onClick={() => handleDelete(r.id)} className="text-xs text-loss hover:underline">
                    Remove
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
