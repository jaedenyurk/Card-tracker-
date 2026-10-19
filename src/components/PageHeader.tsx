import type { ReactNode } from "react";

// The title block every page opens with: a small gold eyebrow, a big tight title, a quiet subtitle, and an optional action on the right.
export function PageHeader({
  eyebrow,
  title,
  subtitle,
  action,
  back,
}: {
  eyebrow: string;
  title: string;
  subtitle?: ReactNode;
  action?: ReactNode;
  back?: ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
      <div className="min-w-0">
        {back && <div className="mb-3">{back}</div>}
        <p className="eyebrow">{eyebrow}</p>
        <h1 className="page-title mt-3 break-words">{title}</h1>
        {subtitle && <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-muted">{subtitle}</p>}
      </div>
      {action}
    </header>
  );
}
