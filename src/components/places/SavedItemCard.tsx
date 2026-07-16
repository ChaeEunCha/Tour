interface SavedItemCardProps {
  name: string;
  category: string;
  address: string;
  onRemove: () => void;
  removing?: boolean;
}

export function SavedItemCard({
  name,
  category,
  address,
  onRemove,
  removing,
}: SavedItemCardProps) {
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-border bg-bg-raised px-4 py-4">
      <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#f6c8b4] to-[#efa98e] font-display text-[10px] uppercase tracking-wide text-black/35">
        IMG
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <p className="truncate text-[15px] font-semibold">{name}</p>
        <p className="truncate text-[12.5px] text-text-muted">
          {category} · {address}
        </p>
      </div>
      <button
        type="button"
        onClick={onRemove}
        disabled={removing}
        aria-label="저장 취소"
        className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent disabled:opacity-50"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
          <path d="M6 3h12v18l-6-4-6 4V3z" />
        </svg>
      </button>
    </div>
  );
}
