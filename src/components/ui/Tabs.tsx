interface Tab<T extends string> {
  value: T;
  label: string;
}

interface TabsProps<T extends string> {
  tabs: Tab<T>[];
  value: T;
  onChange: (value: T) => void;
}

export function Tabs<T extends string>({ tabs, value, onChange }: TabsProps<T>) {
  return (
    <div className="inline-flex gap-0.5 rounded-full border border-border bg-bg p-1">
      {tabs.map((tab) => (
        <button
          key={tab.value}
          type="button"
          onClick={() => onChange(tab.value)}
          className={`rounded-full px-[18px] py-2 text-[13px] font-semibold transition-colors ${
            tab.value === value
              ? "bg-primary text-[#fff9f6]"
              : "text-text-muted"
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
