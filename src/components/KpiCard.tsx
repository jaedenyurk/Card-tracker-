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
    <div className="rounded-xl border border-accent/20 bg-base-900 bg-holo p-5 shadow-panel">
      <p className="text-xs font-medium uppercase tracking-wide text-muted">{label}</p>
      <p
        className={clsx(
          "mt-2 font-mono text-2xl font-bold tabular-nums",
          tone === "gain" && "text-gain",
          tone === "loss" && "text-loss",
          tone === "neutral" && "bg-gradient-to-r from-accent-soft to-fuchsia-300 bg-clip-text text-transparent"
        )}
      >
        {value}
      </p>
      {sublabel && <p className="mt-1 text-xs text-muted">{sublabel}</p>}
    </div>
  );
}
