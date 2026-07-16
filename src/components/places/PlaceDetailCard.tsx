import Image from "next/image";
import type { PlaceDetail } from "@/lib/tourapi/types";

export function PlaceDetailCard({ place }: { place: PlaceDetail }) {
  return (
    <article className="flex flex-col gap-4 rounded-[12px] border border-border bg-bg-raised p-5">
      {place.images[0] && (
        <div className="relative h-56 w-full overflow-hidden rounded-[12px]">
          <Image
            src={place.images[0]}
            alt={place.title}
            fill
            sizes="(max-width: 640px) 100vw, 640px"
            className="object-cover"
          />
        </div>
      )}
      <div className="flex flex-col gap-1">
        <span className="w-fit rounded-full bg-accent-soft px-3 py-1 text-xs font-medium text-accent">
          {place.category}
        </span>
        <h1 className="text-xl font-semibold text-text">{place.title}</h1>
        <p className="text-sm text-text-muted">{place.address}</p>
      </div>
      {place.description && (
        <p className="text-sm leading-6 text-text">{place.description}</p>
      )}
      {place.introDetails.length > 0 && (
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
          {place.introDetails.map((detail) => (
            <div key={detail.label} className="contents">
              <dt className="text-text-muted">{detail.label}</dt>
              <dd className="text-text">{detail.value}</dd>
            </div>
          ))}
        </dl>
      )}
      {place.homepage && (
        <a
          href={place.homepage}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm font-medium text-accent underline"
        >
          홈페이지 방문
        </a>
      )}
    </article>
  );
}
