"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { formatCents, formatPercent } from "@/lib/calculations";
import { KpiCard } from "@/components/KpiCard";
import type { LotRow } from "@/lib/lots";
import type { LotsSummary } from "@/lib/types";

const inputClass =
  "w-full rounded-lg border border-accent/20 bg-base-850 px-3 py-2 text-sm text-white placeholder:text-muted focus:border-accent focus:outline-none";
const labelClass = "mb-1.5 block text-xs font-medium text-muted";

type LotFormValues = {
  name: string;
  source: string;
  purchaseDate: string;
  totalCards: string;
  totalCost: string;
  estValue: string;
  notes: string;
};

const emptyLotForm: LotFormValues = {
  name: "",
  source: "",
  purchaseDate: new Date().toISOString().slice(0, 10),
  totalCards: "",
  totalCost: "",
  estValue: "",
  notes: "",
};

type SaleFormValues = {
  saleDate: string;
  quantity: string;
  salePrice: string;
  notes: string;
};

const emptySaleForm: SaleFormValues = {
  saleDate: new Date().toISOString().slice(0, 10),
  quantity: "",
  salePrice: "",
  notes: "",
};

function LotFields({
  form,
  setForm,
}: {
  form: LotFormValues;
  setForm: (updater: (f: LotFormValues) => LotFormValues) => void;
}) {
  return (
    <>
      <div>
        <label className={labelClass}>Lot Name *</label>
        <input
          required
          className={inputClass}
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          placeholder="2023 Prizm Football mixed lot"
        />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className={labelClass}>Purchase Date *</label>
          <input
            required
            type="date"
            className={inputClass}
            value={form.purchaseDate}
            onChange={(e) => setForm((f) => ({ ...f, purchaseDate: e.target.value }))}
          />
        </div>
        <div>
          <label className={labelClass}>Source</label>
          <input
            className={inputClass}
            value={form.source}
            onChange={(e) => setForm((f) => ({ ...f, source: e.target.value }))}
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
            value={form.totalCards}
            onChange={(e) => setForm((f) => ({ ...f, totalCards: e.target.value }))}
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
            value={form.totalCost}
            onChange={(e) => setForm((f) => ({ ...f, totalCost: e.target.value }))}
            placeholder="0.00"
          />
        </div>
        <div>
          <label className={labelClass}>Est. Value ($)</label>
          <input
            type="number"
            step="0.01"
            min="0"
            className={inputClass}
            value={form.estValue}
            onChange={(e) => setForm((f) => ({ ...f, estValue: e.target.value }))}
            placeholder="Optional — value of what's left unsold"
          />
        </div>
      </div>
      <div>
        <label className={labelClass}>Notes</label>
        <textarea
          className={inputClass}
          rows={2}
          value={form.notes}
          onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
          placeholder="Optional"
        />
      </div>
    </>
  );
}

function SaleFields({
  form,
  setForm,
  maxQuantity,
  costPerCard,
}: {
  form: SaleFormValues;
  setForm: (updater: (f: SaleFormValues) => SaleFormValues) => void;
  maxQuantity: number;
  costPerCard: number; // cents
}) {
  const quantity = Number.parseInt(form.quantity, 10);
  const salePrice = Number.parseFloat(form.salePrice);
  const hasPreview = Number.isFinite(quantity) && quantity > 0 && Number.isFinite(salePrice);
  const costBasisCents = hasPreview ? Math.round(quantity * costPerCard) : 0;
  const profitCents = hasPreview ? Math.round(salePrice * 100) - costBasisCents : 0;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className={labelClass}>Sale Date *</label>
          <input
            required
            type="date"
            className={inputClass}
            value={form.saleDate}
            onChange={(e) => setForm((f) => ({ ...f, saleDate: e.target.value }))}
          />
        </div>
        <div>
          <label className={labelClass}>Cards Sold *</label>
          <input
            required
            type="number"
            step="1"
            min="1"
            max={maxQuantity}
            className={inputClass}
            value={form.quantity}
            onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))}
            placeholder={`Up to ${maxQuantity}`}
          />
        </div>
        <div>
          <label className={labelClass}>Sale Price ($) *</label>
          <input
            required
            type="number"
            step="0.01"
            min="0"
            className={inputClass}
            value={form.salePrice}
            onChange={(e) => setForm((f) => ({ ...f, salePrice: e.target.value }))}
            placeholder="0.00"
          />
        </div>
        <div>
          <label className={labelClass}>Notes</label>
          <input
            className={inputClass}
            value={form.notes}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            placeholder="Optional"
          />
        </div>
      </div>
      <p className="text-xs text-muted">
        {hasPreview ? (
          <>
            Cost basis for {quantity} card{quantity === 1 ? "" : "s"}: {formatCents(costBasisCents)} → profit{" "}
            <span className={profitCents >= 0 ? "text-gain" : "text-loss"}>{formatCents(profitCents)}</span>
          </>
        ) : (
          `Profit is computed automatically: sale price minus ${formatCents(Math.round(costPerCard))}/card cost.`
        )}
      </p>
    </div>
  );
}

export function LotManager({ lots, summary }: { lots: LotRow[]; summary: LotsSummary }) {
  const router = useRouter();

  const [addingLot, setAddingLot] = useState(false);
  const [lotLoading, setLotLoading] = useState(false);
  const [lotError, setLotError] = useState<string | null>(null);
  const [lotForm, setLotForm] = useState<LotFormValues>(emptyLotForm);

  const [editingLotId, setEditingLotId] = useState<string | null>(null);
  const [lotEditForm, setLotEditForm] = useState<LotFormValues>(emptyLotForm);
  const [lotEditLoading, setLotEditLoading] = useState(false);
  const [lotEditError, setLotEditError] = useState<string | null>(null);

  const [activeSaleLotId, setActiveSaleLotId] = useState<string | null>(null);
  const [saleForm, setSaleForm] = useState<SaleFormValues>(emptySaleForm);
  const [saleLoading, setSaleLoading] = useState(false);
  const [saleError, setSaleError] = useState<string | null>(null);

  const [editingSaleId, setEditingSaleId] = useState<string | null>(null);
  const [saleEditForm, setSaleEditForm] = useState<SaleFormValues>(emptySaleForm);
  const [saleEditLoading, setSaleEditLoading] = useState(false);
  const [saleEditError, setSaleEditError] = useState<string | null>(null);

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

  function openEditLot(lot: LotRow) {
    setEditingLotId(lot.id);
    setLotEditError(null);
    setLotEditForm({
      name: lot.name,
      source: lot.source ?? "",
      purchaseDate: lot.purchaseDate.slice(0, 10),
      totalCards: lot.totalCards.toString(),
      totalCost: (lot.totalCost / 100).toString(),
      estValue: lot.estValue != null ? (lot.estValue / 100).toString() : "",
      notes: lot.notes ?? "",
    });
  }

  async function handleSaveLotEdit(e: React.FormEvent, lotId: string) {
    e.preventDefault();
    setLotEditLoading(true);
    setLotEditError(null);
    const res = await fetch(`/api/lots/${lotId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(lotEditForm),
    });
    setLotEditLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setLotEditError(data.error ?? "Failed to save changes");
      return;
    }
    setEditingLotId(null);
    router.refresh();
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

  function openEditSale(sale: LotRow["sales"][number], lot: LotRow) {
    setEditingSaleId(sale.id);
    setSaleEditError(null);
    // Legacy sales logged before salePrice existed only have a stored profit —
    // back into an implied sale price so the form still shows a sensible value.
    const impliedSalePrice = sale.salePrice ?? sale.profit + Math.round(sale.quantity * lot.costPerCard);
    setSaleEditForm({
      saleDate: sale.saleDate.slice(0, 10),
      quantity: sale.quantity.toString(),
      salePrice: (impliedSalePrice / 100).toString(),
      notes: sale.notes ?? "",
    });
  }

  async function handleSaveSaleEdit(e: React.FormEvent, lotId: string, saleId: string) {
    e.preventDefault();
    setSaleEditLoading(true);
    setSaleEditError(null);
    const res = await fetch(`/api/lots/${lotId}/sales/${saleId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(saleEditForm),
    });
    setSaleEditLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setSaleEditError(data.error ?? "Failed to save changes");
      return;
    }
    setEditingSaleId(null);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-white">Large Lot Buys</h2>
          <p className="text-sm text-muted">Bulk purchases tracked as a pool of cards, sold off over time</p>
        </div>
        <button
          onClick={() => setAddingLot((a) => !a)}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-base-950 transition hover:bg-accent-soft"
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
        <form onSubmit={handleAddLot} className="space-y-4 rounded-xl border border-accent/10 bg-base-900 p-5 shadow-panel">
          <LotFields form={lotForm} setForm={setLotForm} />
          {lotError && <p className="text-sm text-loss">{lotError}</p>}
          <button
            type="submit"
            disabled={lotLoading}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-base-950 transition hover:bg-accent-soft disabled:opacity-50"
          >
            {lotLoading ? "Saving..." : "Add Lot"}
          </button>
        </form>
      )}

      {lots.length === 0 ? (
        <div className="rounded-xl border border-accent/10 bg-base-900 p-10 text-center shadow-panel">
          <p className="text-sm text-muted">No lot buys recorded yet.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {lots.map((lot) => {
            const percentSold = lot.totalCards > 0 ? (lot.soldCount / lot.totalCards) * 100 : 0;
            const soldOut = lot.remaining <= 0;
            const historyShown = historyOpen.has(lot.id);

            if (editingLotId === lot.id) {
              return (
                <div key={lot.id} className="rounded-xl border border-accent/10 bg-base-900 p-5 shadow-panel">
                  <form onSubmit={(e) => handleSaveLotEdit(e, lot.id)} className="space-y-4">
                    <LotFields form={lotEditForm} setForm={setLotEditForm} />
                    {lotEditError && <p className="text-sm text-loss">{lotEditError}</p>}
                    <div className="flex gap-2">
                      <button
                        type="submit"
                        disabled={lotEditLoading}
                        className="rounded-lg bg-accent px-3 py-2 text-sm font-medium text-base-950 transition hover:bg-accent-soft disabled:opacity-50"
                      >
                        {lotEditLoading ? "Saving..." : "Save"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingLotId(null)}
                        className="rounded-lg border border-accent/20 px-3 py-2 text-sm text-muted hover:text-white"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              );
            }

            return (
              <div key={lot.id} className="rounded-xl border border-accent/10 bg-base-900 p-5 shadow-panel">
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
                    <button onClick={() => openEditLot(lot)} className="text-xs text-accent hover:underline">
                      Edit
                    </button>
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

                {!soldOut && (
                  <div className="mt-4 grid grid-cols-2 gap-4 border-t border-accent/10 pt-4 sm:grid-cols-4">
                    <div>
                      <p className="text-xs text-muted">Remaining Cost</p>
                      <p className="font-mono text-sm text-white">{formatCents(lot.remainingCostValue)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted">Est. Value</p>
                      <p className="font-mono text-sm text-white">
                        {lot.estValue != null ? formatCents(lot.estValue) : "—"}
                      </p>
                    </div>
                    <div className="col-span-2 sm:col-span-2">
                      <p className="text-xs text-muted">Unrealized P&L</p>
                      <p
                        className={clsx(
                          "font-mono text-sm",
                          lot.unrealizedProfit == null
                            ? "text-muted"
                            : lot.unrealizedProfit >= 0
                              ? "text-gain"
                              : "text-loss"
                        )}
                      >
                        {lot.unrealizedProfit != null ? formatCents(lot.unrealizedProfit) : "Add an Est. Value to see this"}
                      </p>
                    </div>
                  </div>
                )}

                {lot.notes && <p className="mt-3 text-xs text-muted">{lot.notes}</p>}

                <div className="mt-4 flex flex-wrap items-center gap-4 border-t border-accent/10 pt-4">
                  {!soldOut && (
                    <button
                      onClick={() => (activeSaleLotId === lot.id ? setActiveSaleLotId(null) : openSaleForm(lot.id))}
                      className="rounded-lg border border-accent/20 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-accent/10"
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
                    className="mt-4 space-y-3 rounded-lg border border-accent/20 bg-base-850 p-4"
                  >
                    <SaleFields form={saleForm} setForm={setSaleForm} maxQuantity={lot.remaining} costPerCard={lot.costPerCard} />
                    {saleError && <p className="text-sm text-loss">{saleError}</p>}
                    <button
                      type="submit"
                      disabled={saleLoading}
                      className="rounded-lg bg-accent px-3 py-2 text-sm font-medium text-base-950 transition hover:bg-accent-soft disabled:opacity-50"
                    >
                      {saleLoading ? "Saving..." : "Log Sale"}
                    </button>
                  </form>
                )}

                {historyShown && lot.sales.length > 0 && (
                  <ul className="mt-4 divide-y divide-accent/10 border-t border-accent/10">
                    {lot.sales.map((sale) =>
                      editingSaleId === sale.id ? (
                        <li key={sale.id} className="py-4">
                          <form
                            onSubmit={(e) => handleSaveSaleEdit(e, lot.id, sale.id)}
                            className="space-y-3 rounded-lg border border-accent/20 bg-base-850 p-4"
                          >
                            <SaleFields
                              form={saleEditForm}
                              setForm={setSaleEditForm}
                              maxQuantity={lot.remaining + sale.quantity}
                              costPerCard={lot.costPerCard}
                            />
                            {saleEditError && <p className="text-sm text-loss">{saleEditError}</p>}
                            <div className="flex gap-2">
                              <button
                                type="submit"
                                disabled={saleEditLoading}
                                className="rounded-lg bg-accent px-3 py-2 text-sm font-medium text-base-950 transition hover:bg-accent-soft disabled:opacity-50"
                              >
                                {saleEditLoading ? "Saving..." : "Save"}
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingSaleId(null)}
                                className="rounded-lg border border-accent/20 px-3 py-2 text-sm text-muted hover:text-white"
                              >
                                Cancel
                              </button>
                            </div>
                          </form>
                        </li>
                      ) : (
                        <li key={sale.id} className="flex items-center justify-between py-2.5">
                          <div>
                            <p className="text-sm text-white">
                              {sale.quantity} card{sale.quantity === 1 ? "" : "s"}
                              {sale.salePrice != null && (
                                <span className="text-muted"> · sold for {formatCents(sale.salePrice)}</span>
                              )}
                            </p>
                            <p className="text-xs text-muted">
                              {new Date(sale.saleDate).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                                timeZone: "UTC",
                              })}
                              {" · cost "}
                              {formatCents(Math.round(sale.quantity * lot.costPerCard))}
                              {sale.notes ? ` · ${sale.notes}` : ""}
                            </p>
                          </div>
                          <div className="flex items-center gap-4">
                            <span className={clsx("font-mono text-sm", sale.profit >= 0 ? "text-gain" : "text-loss")}>
                              {formatCents(sale.profit)}
                            </span>
                            <button onClick={() => openEditSale(sale, lot)} className="text-xs text-accent hover:underline">
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteSale(lot.id, sale.id)}
                              className="text-xs text-loss hover:underline"
                            >
                              Remove
                            </button>
                          </div>
                        </li>
                      )
                    )}
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
