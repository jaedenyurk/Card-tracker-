import clsx from "clsx";

export function KpiCard({
  label,
  value,
  sublabel,
  tone = "neutral",
}: {
  label: string;
  value: string;
  sublabel?: string;
  tone?: "neutral" | "gain" | "loss";
}) {
  return (
    <div className="rounded-xl border border-white/5 bg-base-900 p-5 shadow-panel">
      <p className="text-xs font-medium uppercase tracking-wide text-muted">{label}</p>
      <p
        className={clsx(
          "mt-2 font-mono text-2xl font-semibold tabular-nums",
          tone === "gain" && "text-gain",
          tone === "loss" && "text-loss",
          tone === "neutral" && "text-white"
        )}
      >
        {value}
      </p>
      {sublabel && <p className="mt-1 text-xs text-muted">{sublabel}</p>}
    </div>
  );
}
