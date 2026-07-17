import type { AccuracyBand } from "@/lib/match/accuracy";

const BAND_STYLES: Record<AccuracyBand, string> = {
  exact: "bg-success-soft text-success",
  likely: "bg-accent-soft text-accent",
  similar: "bg-similar-bg text-similar-fg",
  low: "bg-low-bg text-text-muted",
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
