import type { AccuracyBand } from "@/lib/match/accuracy";

const BAND_STYLES: Record<AccuracyBand, string> = {
  exact:
    "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
  likely: "bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300",
  similar:
    "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  low: "bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
};

export function AccuracyBadge({
  percent,
  band,
}: {
  percent: number;
  band: AccuracyBand;
}) {
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full px-3 py-1 text-sm font-semibold ${BAND_STYLES[band]}`}
    >
      정확도 {percent}%
    </span>
  );
}
