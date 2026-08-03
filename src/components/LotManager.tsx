"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { formatCents, formatPercent } from "@/lib/calculations";
import { KpiCard } from "@/components/KpiCard";
import type { LotRow } from "@/lib/lots";
import type { LotsSummary } from "@/lib/types";

const inputClass =
  "w-full rounded-lg border border-white/10 bg-base-850 px-3 py-2 text-sm text-white placeholder:text-muted focus:border-accent focus:outline-none";
const labelClass = "mb-1.5 block text-xs font-medium text-muted";

const emptyLotForm = {
  name: "",
  source: "",
  purchaseDate: new Date().toISOString().slice(0, 10),
  totalCards: "",
  totalCost: "",
  notes: "",
};

const emptySaleForm = {
  saleDate: new Date().toISOString().slice(0, 10),
  quantity: "",
  profit: "",
  notes: "",
};

export function LotManager({ lots, summary }: { lots: LotRow[]; summary: LotsSummary }) {
  const router = useRouter();

  const [addingLot, setAddingLot] = useState(false);
  const [lotLoading, setLotLoading] = useState(false);
  const [lotError, setLotError] = useState<string | null>(null);
  const [lotForm, setLotForm] = useState(emptyLotForm);

  const [activeSaleLotId, setActiveSaleLotId] = useState<string | null>(null);
  const [saleForm, setSaleForm] = useState(emptySaleForm);
  const [saleLoading, setSaleLoading] = useState(false);
  const [saleError, setSaleError] = useState<string | null>(null);

  const [historyOpen, setHistoryOpen] = useState<Set<string>>(new Set());

  function toggleHistory(lotId: string) {
    setHistoryOpen((prev) => {
      const next = new Set(prev);
      if (next.has(lotId)) next.delete(lotId);
      else next.add(lotId);
      return next;
    });
  }

  async function handleAddLot(e: React.FormEvent) {
    e.preventDefault();
    setLotLoading(true);
    setLotError(null);
    const res = await fetch("/api/lots", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(lotForm),
    });
    setLotLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setLotError(data.error ?? "Failed to add lot");
      return;
    }
    setLotForm(emptyLotForm);
    setAddingLot(false);
    router.refresh();
  }

  async function handleDeleteLot(id: string) {
    if (!confirm("Delete this lot and all of its recorded sales? This cannot be undone.")) return;
    const res = await fetch(`/api/lots/${id}`, { method: "DELETE" });
    if (res.ok) router.refresh();
  }

  function openSaleForm(lotId: string) {
    setActiveSaleLotId(lotId);
    setSaleForm(emptySaleForm);
    setSaleError(null);
  }

  async function handleAddSale(e: React.FormEvent, lotId: string) {
    e.preventDefault();
    setSaleLoading(true);
    setSaleError(null);
    const res = await fetch(`/api/lots/${lotId}/sales`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(saleForm),
    });
    setSaleLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setSaleError(data.error ?? "Failed to log sale");
      return;
    }
    setActiveSaleLotId(null);
    setSaleForm(emptySaleForm);
    router.refresh();
  }

  async function handleDeleteSale(lotId: string, saleId: string) {
    if (!confirm("Remove this sale? The cards will go back to remaining.")) return;
    const res = await fetch(`/api/lots/${lotId}/sales/${saleId}`, { method: "DELETE" });
    if (res.ok) router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-white">Large Lot Buys</h2>
          <p className="text-sm text-muted">Bulk purchases tracked as a pool of cards, sold off over time</p>
        </div>
        <button
          onClick={() => setAddingLot((a) => !a)}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition hover:bg-accent-soft"
        >
          {addingLot ? "Cancel" : "+ Add Lot"}
        </button>
      </div>

      {lots.length > 0 && (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <KpiCard
            label="Cards Sold"
            value={`${summary.totalCardsSold} / ${summary.totalCardsBought}`}
            sublabel={summary.percentSold != null ? `${summary.percentSold.toFixed(0)}% of lots sold` : undefined}
          />
          <KpiCard label="Total Invested" value={formatCents(summary.totalInvested)} sublabel={`${summary.lotCount} lot${summary.lotCount === 1 ? "" : "s"}`} />
          <KpiCard
            label="Realized Profit"
            value={formatCents(summary.totalRealizedProfit)}
            tone={summary.totalRealizedProfit >= 0 ? "gain" : "loss"}
            sublabel="From logged sales"
          />
          <KpiCard
            label="Lot ROI"
            value={formatPercent(summary.overallROI)}
            tone={summary.overallROI != null && summary.overallROI >= 0 ? "gain" : summary.overallROI != null ? "loss" : "neutral"}
            sublabel="Profit vs. total invested"
          />
        </div>
      )}

      {addingLot && (
        <form onSubmit={handleAddLot} className="space-y-4 rounded-xl border border-white/5 bg-base-900 p-5 shadow-panel">
          <div>
            <label className={labelClass}>Lot Name *</label>
            <input
              required
              className={inputClass}
              value={lotForm.name}
              onChange={(e) => setLotForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="2023 Prizm Football mixed lot"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Purchase Date *</label>
              <input
                required
                type="date"
                className={inputClass}
                value={lotForm.purchaseDate}
                onChange={(e) => setLotForm((f) => ({ ...f, purchaseDate: e.target.value }))}
              />
            </div>
            <div>
              <label className={labelClass}>Source</label>
              <input
                className={inputClass}
                value={lotForm.source}
                onChange={(e) => setLotForm((f) => ({ ...f, source: e.target.value }))}
                placeholder="eBay, local show..."
              />
            </div>
            <div>
              <label className={labelClass}>Total Cards *</label>
              <input
                required
                type="number"
                step="1"
                min="1"
                className={inputClass}
                value={lotForm.totalCards}
                onChange={(e) => setLotForm((f) => ({ ...f, totalCards: e.target.value }))}
                placeholder="50"
              />
            </div>
            <div>
              <label className={labelClass}>Total Price ($) *</label>
              <input
                required
                type="number"
                step="0.01"
                min="0"
                className={inputClass}
                value={lotForm.totalCost}
                onChange={(e) => setLotForm((f) => ({ ...f, totalCost: e.target.value }))}
                placeholder="0.00"
              />
            </div>
          </div>
          <div>
            <label className={labelClass}>Notes</label>
            <textarea
              className={inputClass}
              rows={2}
              value={lotForm.notes}
              onChange={(e) => setLotForm((f) => ({ ...f, notes: e.target.value }))}
              placeholder="Optional"
            />
          </div>
          {lotError && <p className="text-sm text-loss">{lotError}</p>}
          <button
            type="submit"
            disabled={lotLoading}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition hover:bg-accent-soft disabled:opacity-50"
          >
            {lotLoading ? "Saving..." : "Add Lot"}
          </button>
        </form>
      )}

      {lots.length === 0 ? (
        <div className="rounded-xl border border-white/5 bg-base-900 p-10 text-center shadow-panel">
          <p className="text-sm text-muted">No lot buys recorded yet.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {lots.map((lot) => {
            const percentSold = lot.totalCards > 0 ? (lot.soldCount / lot.totalCards) * 100 : 0;
            const soldOut = lot.remaining <= 0;
            const historyShown = historyOpen.has(lot.id);

            return (
              <div key={lot.id} className="rounded-xl border border-white/5 bg-base-900 p-5 shadow-panel">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-white">{lot.name}</p>
                    <p className="text-xs text-muted">
                      {lot.source ? `${lot.source} · ` : ""}
                      {new Date(lot.purchaseDate).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                        timeZone: "UTC",
                      })}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className={clsx(
                        "rounded-full px-2 py-0.5 text-xs",
                        soldOut ? "bg-gain/15 text-gain" : "bg-accent/15 text-accent"
                      )}
                    >
                      {soldOut ? "Fully sold" : `${lot.soldCount} / ${lot.totalCards} sold`}
                    </span>
                    <button onClick={() => handleDeleteLot(lot.id)} className="text-xs text-loss hover:underline">
                      Delete
                    </button>
                  </div>
                </div>

                <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-base-850">
                  <div
                    className="h-full rounded-full bg-accent transition-all"
                    style={{ width: `${Math.min(100, percentSold)}%` }}
                  />
                </div>

                <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
                  <div>
                    <p className="text-xs text-muted">Total Cost</p>
                    <p className="font-mono text-sm text-white">{formatCents(lot.totalCost)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted">Cost / Card</p>
                    <p className="font-mono text-sm text-white">{formatCents(lot.costPerCard)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted">Profit So Far</p>
                    <p className={clsx("font-mono text-sm", lot.realizedProfit >= 0 ? "text-gain" : "text-loss")}>
                      {formatCents(lot.realizedProfit)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted">ROI</p>
                    <p
                      className={clsx(
                        "font-mono text-sm",
                        lot.roi == null ? "text-muted" : lot.roi >= 0 ? "text-gain" : "text-loss"
                      )}
                    >
                      {formatPercent(lot.roi)}
                    </p>
                  </div>
                </div>

                {lot.notes && <p className="mt-3 text-xs text-muted">{lot.notes}</p>}

                <div className="mt-4 flex flex-wrap items-center gap-4 border-t border-white/5 pt-4">
                  {!soldOut && (
                    <button
                      onClick={() => (activeSaleLotId === lot.id ? setActiveSaleLotId(null) : openSaleForm(lot.id))}
                      className="rounded-lg border border-white/10 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-white/5"
                    >
                      {activeSaleLotId === lot.id ? "Cancel" : "+ Add Sale"}
                    </button>
                  )}
                  {lot.sales.length > 0 && (
                    <button onClick={() => toggleHistory(lot.id)} className="text-xs text-accent hover:underline">
                      {historyShown ? "Hide" : "Show"} sale history ({lot.sales.length})
                    </button>
                  )}
                </div>

                {activeSaleLotId === lot.id && (
                  <form
                    onSubmit={(e) => handleAddSale(e, lot.id)}
                    className="mt-4 space-y-3 rounded-lg border border-white/10 bg-base-850 p-4"
                  >
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className={labelClass}>Sale Date *</label>
                        <input
                          required
                          type="date"
                          className={inputClass}
                          value={saleForm.saleDate}
                          onChange={(e) => setSaleForm((f) => ({ ...f, saleDate: e.target.value }))}
                        />
                      </div>
                      <div>
                        <label className={labelClass}>Cards Sold *</label>
                        <input
                          required
                          type="number"
                          step="1"
                          min="1"
                          max={lot.remaining}
                          className={inputClass}
                          value={saleForm.quantity}
                          onChange={(e) => setSaleForm((f) => ({ ...f, quantity: e.target.value }))}
                          placeholder={`Up to ${lot.remaining}`}
                        />
                      </div>
                      <div>
                        <label className={labelClass}>Profit ($) *</label>
                        <input
                          required
                          type="number"
                          step="0.01"
                          className={inputClass}
                          value={saleForm.profit}
                          onChange={(e) => setSaleForm((f) => ({ ...f, profit: e.target.value }))}
                          placeholder="0.00"
                        />
                      </div>
                      <div>
                        <label className={labelClass}>Notes</label>
                        <input
                          className={inputClass}
                          value={saleForm.notes}
                          onChange={(e) => setSaleForm((f) => ({ ...f, notes: e.target.value }))}
                          placeholder="Optional"
                        />
                      </div>
                    </div>
                    {saleError && <p className="text-sm text-loss">{saleError}</p>}
                    <button
                      type="submit"
                      disabled={saleLoading}
                      className="rounded-lg bg-accent px-3 py-2 text-sm font-medium text-white transition hover:bg-accent-soft disabled:opacity-50"
                    >
                      {saleLoading ? "Saving..." : "Log Sale"}
                    </button>
                  </form>
                )}

                {historyShown && lot.sales.length > 0 && (
                  <ul className="mt-4 divide-y divide-white/5 border-t border-white/5">
                    {lot.sales.map((sale) => (
                      <li key={sale.id} className="flex items-center justify-between py-2.5">
                        <div>
                          <p className="text-sm text-white">
                            {sale.quantity} card{sale.quantity === 1 ? "" : "s"}
                          </p>
                          <p className="text-xs text-muted">
                            {new Date(sale.saleDate).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                              timeZone: "UTC",
                            })}
                            {sale.notes ? ` · ${sale.notes}` : ""}
                          </p>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className={clsx("font-mono text-sm", sale.profit >= 0 ? "text-gain" : "text-loss")}>
                            {formatCents(sale.profit)}
                          </span>
                          <button
                            onClick={() => handleDeleteSale(lot.id, sale.id)}
                            className="text-xs text-loss hover:underline"
                          >
                            Remove
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
