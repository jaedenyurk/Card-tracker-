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
    <div className="rounded-lg border border-white/10 bg-base-850 px-3 py-2 text-xs shadow-panel">
      <p className="mb-1 font-medium text-white">{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} style={{ color: p.color }}>
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
    <div className="rounded-xl border border-white/5 bg-base-900 p-5 shadow-panel">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-white">Revenue vs. Expenses</h2>
        <div className="flex rounded-lg border border-white/10 bg-base-850 p-0.5 text-xs">
          {(["monthly", "yearly"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={
                "rounded-md px-3 py-1 capitalize transition " +
                (view === v ? "bg-accent text-white" : "text-muted hover:text-white")
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
            <CartesianGrid stroke="#212b3d" vertical={false} />
            <XAxis
              dataKey="label"
              stroke="#8a94a6"
              fontSize={12}
              tickLine={false}
              axisLine={{ stroke: "#212b3d" }}
            />
            <YAxis
              stroke="#8a94a6"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => formatCents(v)}
              width={70}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
            <Legend wrapperStyle={{ fontSize: 12, color: "#8a94a6" }} />
            <Bar dataKey="revenue" name="Revenue" fill="#4f7cff" radius={[4, 4, 0, 0]} />
            <Bar dataKey="expenses" name="Expenses" fill="#f43f5e" radius={[4, 4, 0, 0]} fillOpacity={0.7} />
            <Line
              type="monotone"
              dataKey="profit"
              name="Net Profit"
              stroke="#22c55e"
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
