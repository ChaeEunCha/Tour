import Image from "next/image";
import Link from "next/link";
import type { PlaceMatch } from "@/lib/match/engine";
import { AccuracyBadge } from "./AccuracyBadge";

export function MatchResultCard({ result }: { result: PlaceMatch }) {
  return (
    <div className="flex gap-4 rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="h-24 w-24 flex-shrink-0 overflow-hidden rounded-xl bg-zinc-100 dark:bg-zinc-800">
        {result.thumbnailUrl && (
          <Image
            src={result.thumbnailUrl}
            alt={result.name}
            width={96}
            height={96}
            className="h-full w-full object-cover"
          />
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-lg font-semibold">{result.name}</h3>
          <AccuracyBadge percent={result.accuracyPercent} band={result.band} />
        </div>
        {result.category && (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {result.category}
          </p>
        )}
        {result.address && (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {result.address}
          </p>
        )}
        <p className="mt-1 text-sm text-zinc-700 dark:text-zinc-300">
          {result.message}
        </p>
        {result.tourContentId && (
          <Link
            href={`/places/${result.tourContentId}`}
            className="mt-2 w-fit rounded-full bg-primary px-4 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-primary-hover"
          >
            상세정보 보기
          </Link>
        )}
      </div>
    </div>
  );
}
