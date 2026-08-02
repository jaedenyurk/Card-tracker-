"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const inputClass =
  "w-full rounded-lg border border-white/10 bg-base-850 px-3 py-2 text-sm text-white placeholder:text-muted focus:border-accent focus:outline-none";
const labelClass = "mb-1.5 block text-xs font-medium text-muted";

const SPORTS = ["Baseball", "Basketball", "Football", "Hockey", "Soccer", "Golf", "Other"];
const GRADING_COMPANIES = ["", "PSA", "BGS", "SGC", "CGC", "TAG"];

export default function NewCardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    player: "",
    sport: "Baseball",
    year: "",
    setName: "",
    cardNumber: "",
    parallel: "",
    gradingCo: "",
    grade: "",
    purchaseDate: new Date().toISOString().slice(0, 10),
    purchasePrice: "",
    purchasePlatform: "",
    marketValue: "",
    imageUrl: "",
    notes: "",
  });

  function update<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch("/api/cards", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Failed to save card");
      setLoading(false);
      return;
    }
    const card = await res.json();
    router.push(`/inventory/${card.id}`);
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-white">Add Card</h1>
        <p className="text-sm text-muted">Log a new purchase for your inventory</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5 rounded-xl border border-white/5 bg-base-900 p-6 shadow-panel">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className={labelClass}>Player *</label>
            <input
              required
              className={inputClass}
              value={form.player}
              onChange={(e) => update("player", e.target.value)}
              placeholder="e.g. Victor Wembanyama"
            />
          </div>

          <div>
            <label className={labelClass}>Sport *</label>
            <select className={inputClass} value={form.sport} onChange={(e) => update("sport", e.target.value)}>
              {SPORTS.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelClass}>Year</label>
            <input className={inputClass} value={form.year} onChange={(e) => update("year", e.target.value)} placeholder="2023" />
          </div>

          <div>
            <label className={labelClass}>Set</label>
            <input className={inputClass} value={form.setName} onChange={(e) => update("setName", e.target.value)} placeholder="Prizm" />
          </div>

          <div>
            <label className={labelClass}>Card #</label>
            <input className={inputClass} value={form.cardNumber} onChange={(e) => update("cardNumber", e.target.value)} placeholder="#123" />
          </div>

          <div>
            <label className={labelClass}>Parallel</label>
            <input className={inputClass} value={form.parallel} onChange={(e) => update("parallel", e.target.value)} placeholder="Silver" />
          </div>

          <div>
            <label className={labelClass}>Grading Co.</label>
            <select className={inputClass} value={form.gradingCo} onChange={(e) => update("gradingCo", e.target.value)}>
              {GRADING_COMPANIES.map((g) => (
                <option key={g} value={g}>{g || "Raw / Ungraded"}</option>
              ))}
            </select>
          </div>

          {form.gradingCo && (
            <div>
              <label className={labelClass}>Grade</label>
              <input className={inputClass} value={form.grade} onChange={(e) => update("grade", e.target.value)} placeholder="10" />
            </div>
          )}
        </div>

        <hr className="border-white/5" />

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Purchase Date *</label>
            <input
              required
              type="date"
              className={inputClass}
              value={form.purchaseDate}
              onChange={(e) => update("purchaseDate", e.target.value)}
            />
          </div>
          <div>
            <label className={labelClass}>Purchase Price ($) *</label>
            <input
              required
              type="number"
              step="0.01"
              min="0"
              className={inputClass}
              value={form.purchasePrice}
              onChange={(e) => update("purchasePrice", e.target.value)}
              placeholder="0.00"
            />
          </div>
          <div>
            <label className={labelClass}>Purchase Platform</label>
            <input
              className={inputClass}
              value={form.purchasePlatform}
              onChange={(e) => update("purchasePlatform", e.target.value)}
              placeholder="eBay, COMC, local show..."
            />
          </div>
          <div>
            <label className={labelClass}>Est. Current Value ($)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              className={inputClass}
              value={form.marketValue}
              onChange={(e) => update("marketValue", e.target.value)}
              placeholder="Optional"
            />
          </div>
        </div>

        <hr className="border-white/5" />

        <div>
          <label className={labelClass}>Image URL</label>
          <input className={inputClass} value={form.imageUrl} onChange={(e) => update("imageUrl", e.target.value)} placeholder="Optional" />
        </div>
        <div>
          <label className={labelClass}>Notes</label>
          <textarea
            className={inputClass}
            rows={3}
            value={form.notes}
            onChange={(e) => update("notes", e.target.value)}
            placeholder="Optional"
          />
        </div>

        {error && <p className="text-sm text-loss">{error}</p>}

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition hover:bg-accent-soft disabled:opacity-50"
          >
            {loading ? "Saving..." : "Save Card"}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="rounded-lg border border-white/10 px-4 py-2 text-sm text-muted transition hover:text-white"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
