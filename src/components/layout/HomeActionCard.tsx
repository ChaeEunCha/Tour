import Link from "next/link";
import { ReactNode } from "react";

interface HomeActionCardProps {
  href: string;
  icon: ReactNode;
  title: string;
  description: string;
}

export function HomeActionCard({
  href,
  icon,
  title,
  description,
}: HomeActionCardProps) {
  return (
    <Link
      href={href}
      className="flex items-center gap-4 rounded-2xl border border-border bg-bg-raised px-5 py-5 transition-colors hover:border-accent"
    >
      <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent">
        {icon}
      </span>
      <span className="flex flex-col gap-0.5">
        <span className="text-[15.5px] font-semibold">{title}</span>
        <span className="text-[13px] text-text-muted">{description}</span>
      </span>
    </Link>
  );
}
