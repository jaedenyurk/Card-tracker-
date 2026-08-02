"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const inputClass =
  "w-full rounded-lg border border-white/10 bg-base-850 px-3 py-2 text-sm text-white placeholder:text-muted focus:border-accent focus:outline-none";
const labelClass = "mb-1.5 block text-xs font-medium text-muted";

interface Props {
  cardId: string;
  status: "HELD" | "SOLD";
  marketValueDollars: number | null;
}

export function CardActionsPanel({ cardId, status, marketValueDollars }: Props) {
  const router = useRouter();
  const [mode, setMode] = useState<"idle" | "sell" | "value">("idle");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [soldDate, setSoldDate] = useState(new Date().toISOString().slice(0, 10));
  const [soldPrice, setSoldPrice] = useState("");
  const [soldPlatform, setSoldPlatform] = useState("");
  const [marketValue, setMarketValue] = useState(marketValueDollars?.toString() ?? "");

  async function patch(body: Record<string, unknown>) {
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/cards/${cardId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Something went wrong");
      return false;
    }
    router.refresh();
    return true;
  }

  async function handleSell(e: React.FormEvent) {
    e.preventDefault();
    const ok = await patch({ status: "SOLD", soldDate, soldPrice, soldPlatform });
    if (ok) setMode("idle");
  }

  async function handleUpdateValue(e: React.FormEvent) {
    e.preventDefault();
    const ok = await patch({ marketValue });
    if (ok) setMode("idle");
  }

  async function handleRevert() {
    if (!confirm("Revert this card back to Held? This clears its sale info.")) return;
    await patch({ status: "HELD" });
  }

  async function handleDelete() {
    if (!confirm("Delete this card permanently? This cannot be undone.")) return;
    setLoading(true);
    const res = await fetch(`/api/cards/${cardId}`, { method: "DELETE" });
    setLoading(false);
    if (res.ok) {
      router.push("/inventory");
      router.refresh();
    } else {
      setError("Failed to delete");
    }
  }

  return (
    <div className="rounded-xl border border-white/5 bg-base-900 p-5 shadow-panel">
      <h2 className="mb-4 text-sm font-semibold text-white">Actions</h2>

      {error && <p className="mb-3 text-sm text-loss">{error}</p>}

      {mode === "idle" && (
        <div className="flex flex-wrap gap-2">
          {status === "HELD" ? (
            <>
              <button
                onClick={() => setMode("sell")}
                className="rounded-lg bg-accent px-3 py-2 text-sm font-medium text-white transition hover:bg-accent-soft"
              >
                Mark as Sold
              </button>
              <button
                onClick={() => setMode("value")}
                className="rounded-lg border border-white/10 px-3 py-2 text-sm text-white transition hover:bg-white/5"
              >
                Update Est. Value
              </button>
            </>
          ) : (
            <button
              onClick={handleRevert}
              disabled={loading}
              className="rounded-lg border border-white/10 px-3 py-2 text-sm text-white transition hover:bg-white/5"
            >
              Revert to Held
            </button>
          )}
          <button
            onClick={handleDelete}
            disabled={loading}
            className="rounded-lg border border-loss/30 px-3 py-2 text-sm text-loss transition hover:bg-loss/10"
          >
            Delete Card
          </button>
        </div>
      )}

      {mode === "sell" && (
        <form onSubmit={handleSell} className="space-y-3">
          <div>
            <label className={labelClass}>Sold Date *</label>
            <input required type="date" className={inputClass} value={soldDate} onChange={(e) => setSoldDate(e.target.value)} />
          </div>
          <div>
            <label className={labelClass}>Sold Price ($) *</label>
            <input
              required
              type="number"
              step="0.01"
              min="0"
              className={inputClass}
              value={soldPrice}
              onChange={(e) => setSoldPrice(e.target.value)}
              placeholder="0.00"
            />
          </div>
          <div>
            <label className={labelClass}>Sold Platform</label>
            <input className={inputClass} value={soldPlatform} onChange={(e) => setSoldPlatform(e.target.value)} placeholder="eBay, PWCC..." />
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-accent px-3 py-2 text-sm font-medium text-white transition hover:bg-accent-soft disabled:opacity-50"
            >
              {loading ? "Saving..." : "Confirm Sale"}
            </button>
            <button
              type="button"
              onClick={() => setMode("idle")}
              className="rounded-lg border border-white/10 px-3 py-2 text-sm text-muted hover:text-white"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {mode === "value" && (
        <form onSubmit={handleUpdateValue} className="space-y-3">
          <div>
            <label className={labelClass}>Estimated Current Value ($)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              className={inputClass}
              value={marketValue}
              onChange={(e) => setMarketValue(e.target.value)}
              placeholder="0.00"
            />
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-accent px-3 py-2 text-sm font-medium text-white transition hover:bg-accent-soft disabled:opacity-50"
            >
              {loading ? "Saving..." : "Save"}
            </button>
            <button
              type="button"
              onClick={() => setMode("idle")}
              className="rounded-lg border border-white/10 px-3 py-2 text-sm text-muted hover:text-white"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
