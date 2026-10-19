"use client";

import { useState } from "react";
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { formatCents } from "@/lib/calculations";
import type { MonthlyPoint, YearlyPoint } from "@/lib/types";

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-2xl border border-line bg-card px-3.5 py-2.5 text-xs shadow-lift">
      <p className="mb-1.5 font-bold text-fg">{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} className="flex items-center gap-2 tabular-nums text-fg">
          <span className="h-2 w-2 rounded-full" style={{ background: p.color }} />
          {p.name}: {formatCents(p.value)}
        </p>
      ))}
    </div>
  );
}

export function RevenueChart({
  monthly,
  yearly,
}: {
  monthly: MonthlyPoint[];
  yearly: YearlyPoint[];
}) {
  const [view, setView] = useState<"monthly" | "yearly">("monthly");

  // Values stay in cents; formatCents() handles conversion for axis ticks,
  // the tooltip, and anywhere else they're displayed.
  const scaled =
    view === "monthly"
      ? monthly.map((p) => ({ label: p.label, revenue: p.revenue, expenses: p.expenses, profit: p.profit }))
      : yearly.map((p) => ({ label: p.key, revenue: p.revenue, expenses: p.expenses, profit: p.profit }));

  const hasData = scaled.length > 0 && scaled.some((d) => d.revenue || d.expenses);

  return (
    <div className="panel p-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-base font-bold tracking-tight text-fg">Revenue vs. Expenses</h2>
        <div className="seg">
          {(["monthly", "yearly"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={
                "seg-tab capitalize " +
                (view === v ? "seg-tab-on" : "")
              }
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      {hasData ? (
        <ResponsiveContainer width="100%" height={280}>
          <ComposedChart data={scaled} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid stroke="rgb(var(--line))" vertical={false} />
            <XAxis
              dataKey="label"
              stroke="rgb(var(--muted))"
              fontSize={12}
              tickLine={false}
              axisLine={{ stroke: "rgb(var(--line))" }}
            />
            <YAxis
              stroke="rgb(var(--muted))"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => formatCents(v)}
              width={70}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgb(var(--gold) / 0.08)" }} />
            <Legend wrapperStyle={{ fontSize: 12, color: "rgb(var(--muted))" }} />
            <Bar dataKey="revenue" name="Revenue" fill="rgb(var(--gold))" radius={[4, 4, 0, 0]} />
            <Bar dataKey="expenses" name="Expenses" fill="rgb(var(--danger))" radius={[4, 4, 0, 0]} fillOpacity={0.75} />
            <Line
              type="monotone"
              dataKey="profit"
              name="Net Profit"
              stroke="rgb(var(--success))"
              strokeWidth={2}
              dot={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      ) : (
        <div className="flex h-[280px] items-center justify-center text-sm text-muted">
          No sales or expenses recorded yet.
        </div>
      )}
    </div>
  );
}
