interface HeartToggleProps {
  saved: boolean;
  onClick: () => void;
  disabled?: boolean;
}

export function HeartToggle({ saved, onClick, disabled }: HeartToggleProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={saved ? "저장 취소" : "저장하기"}
      aria-pressed={saved}
      className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-bg-raised border border-border transition-colors disabled:opacity-50"
    >
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill={saved ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="1.8"
        className={saved ? "text-primary" : "text-text-muted"}
      >
        <path d="M12 20.5s-7.5-4.6-10-9A5.5 5.5 0 0 1 12 5.5 5.5 5.5 0 0 1 22 11.5c-2.5 4.4-10 9-10 9z" />
      </svg>
    </button>
  );
}
