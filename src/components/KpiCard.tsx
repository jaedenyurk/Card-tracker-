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
    <div className="panel p-6">
      <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted">{label}</p>
      <p
        className={clsx(
          "mt-3 font-display text-[28px] font-extrabold leading-none tracking-[-0.03em] tabular-nums",
          tone === "gain" && "text-ok-text",
          tone === "loss" && "text-bad-text",
          tone === "neutral" && "text-fg"
        )}
      >
        {value}
      </p>
      {sublabel && <p className="mt-2.5 text-xs text-muted">{sublabel}</p>}
    </div>
  );
}
