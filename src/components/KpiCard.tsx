import clsx from "clsx";

export function KpiCard({
  label,
  value,
  secondary,
  sublabel,
  tone = "neutral",
}: {
  label: string;
  value: string;
  /** A second, smaller figure under the main value, e.g. the dollar amount behind a percentage. */
  secondary?: { text: string; tone?: "neutral" | "gain" | "loss" };
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
      {secondary && (
        <p
          className={clsx(
            "mt-2 text-[15px] font-bold tabular-nums",
            secondary.tone === "gain" && "text-ok-text",
            secondary.tone === "loss" && "text-bad-text",
            (secondary.tone ?? "neutral") === "neutral" && "text-fg"
          )}
        >
          {secondary.text}
        </p>
      )}
      {sublabel && <p className="mt-2.5 text-xs text-muted">{sublabel}</p>}
    </div>
  );
}
