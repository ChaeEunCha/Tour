interface MapSearchLoadingProps {
  message: React.ReactNode;
}

export function MapSearchLoading({ message }: MapSearchLoadingProps) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-5 bg-bg">
      <div className="relative h-60 w-60 overflow-hidden rounded-[2rem] border border-border bg-bg-raised sm:h-72 sm:w-72">
        <svg viewBox="0 0 200 200" className="h-full w-full">
          {/* roads */}
          <path d="M0 70 H200" className="stroke-border" strokeWidth="6" />
          <path d="M0 150 H200" className="stroke-border" strokeWidth="6" />
          <path d="M60 0 V200" className="stroke-border" strokeWidth="6" />
          <path d="M150 0 V200" className="stroke-border" strokeWidth="6" />
          <path d="M0 10 L200 120" className="stroke-border" strokeWidth="4" opacity="0.6" />

          {/* blocks */}
          <rect x="14" y="14" width="34" height="44" rx="10" className="fill-accent-soft" />
          <rect x="76" y="20" width="60" height="36" rx="10" className="fill-low-bg" />
          <rect x="18" y="90" width="30" height="46" rx="10" className="fill-success-soft" />
          <rect x="76" y="86" width="52" height="50" rx="12" className="fill-similar-bg" />
          <rect x="160" y="20" width="26" height="110" rx="10" className="fill-accent-soft" />
          <rect x="76" y="160" width="80" height="26" rx="10" className="fill-low-bg" />

          {/* candidate pins */}
          <circle cx="40" cy="40" r="5" className="fill-success" />
          <circle cx="100" cy="105" r="5" className="fill-primary" />
          <circle cx="172" cy="70" r="5" className="fill-success" />
        </svg>

        {/* magnifier, wanders the map searching for the match */}
        <div className="absolute inset-0 flex items-center justify-center">
          <svg
            viewBox="0 0 40 40"
            className="h-14 w-14 drop-shadow-md motion-safe:animate-[map-search_5s_ease-in-out_infinite]"
          >
            <circle
              cx="17"
              cy="17"
              r="11"
              className="fill-bg/40 stroke-accent"
              strokeWidth="5"
            />
            <line
              x1="25"
              y1="25"
              x2="36"
              y2="36"
              className="stroke-accent"
              strokeWidth="6"
              strokeLinecap="round"
            />
          </svg>
        </div>
      </div>
      <p className="font-display text-xl font-bold">{message}</p>
    </div>
  );
}
