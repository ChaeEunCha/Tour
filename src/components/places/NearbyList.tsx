"use client";

import { useState } from "react";
import type { KakaoPlace } from "@/lib/kakao/local";
import { KakaoSaveButton } from "./KakaoSaveButton";

type Tab = "food" | "play";

const INITIAL_VISIBLE_COUNT = 6;

export function NearbyList({ food, play }: { food: KakaoPlace[]; play: KakaoPlace[] }) {
  const [tab, setTab] = useState<Tab>("food");
  const [expandedTabs, setExpandedTabs] = useState<Set<Tab>>(new Set());
  const items = tab === "food" ? food : play;
  const isExpanded = expandedTabs.has(tab);
  const visibleItems = isExpanded ? items : items.slice(0, INITIAL_VISIBLE_COUNT);
  const hasMore = items.length > INITIAL_VISIBLE_COUNT && !isExpanded;

  return (
    <section className="flex flex-col gap-3">
      <div className="flex w-fit gap-1 rounded-full border border-border bg-bg-raised p-1">
        <button
          type="button"
          onClick={() => setTab("food")}
          className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
            tab === "food" ? "bg-primary text-white" : "text-text-muted"
          }`}
        >
          먹거리 ({food.length})
        </button>
        <button
          type="button"
          onClick={() => setTab("play")}
          className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
            tab === "play" ? "bg-accent text-white" : "text-text-muted"
          }`}
        >
          놀거리 ({play.length})
        </button>
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-text-muted">반경 내에 결과가 없어요.</p>
      ) : (
        <>
          <ul className="flex flex-col gap-2">
            {visibleItems.map((item) => (
              <li
                key={item.id}
                className="flex items-center justify-between rounded-[12px] border border-border bg-bg-raised px-4 py-3"
              >
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm font-medium text-text">{item.placeName}</span>
                  <span className="text-xs text-text-muted">{item.categoryName}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-medium text-text-muted">
                    {Math.round(item.distance)}m
                  </span>
                  <KakaoSaveButton item={item} type={tab} />
                </div>
              </li>
            ))}
          </ul>
          {hasMore && (
            <button
              type="button"
              onClick={() => setExpandedTabs((prev) => new Set(prev).add(tab))}
              className="w-full rounded-[12px] border border-border bg-bg-raised py-2.5 text-sm font-medium text-text-muted transition-colors hover:text-text"
            >
              더보기 ({items.length - INITIAL_VISIBLE_COUNT}개 더)
            </button>
          )}
        </>
      )}
    </section>
  );
}
