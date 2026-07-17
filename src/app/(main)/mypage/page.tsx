"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { Tabs } from "@/components/ui/Tabs";
import { Button } from "@/components/ui/Button";
import { SavedItemCard } from "@/components/places/SavedItemCard";

type SavedType = "place" | "food" | "play";

const TABS: { value: SavedType; label: string }[] = [
  { value: "place", label: "관광지" },
  { value: "food", label: "먹거리" },
  { value: "play", label: "놀거리" },
];

interface SavedPlaceRow {
  id: string;
  place_id: string;
  places: { name: string; category: string; address: string } | null;
}

interface SavedKakaoPlaceRow {
  id: string;
  place_name: string;
  category_name: string;
  address_name: string;
}

interface SavedListItem {
  id: string;
  name: string;
  category: string;
  address: string;
}

export default function MyPage() {
  const [user, setUser] = useState<User | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [activeTab, setActiveTab] = useState<SavedType>("place");
  const [items, setItems] = useState<SavedListItem[]>([]);
  const [loadedFor, setLoadedFor] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const requestKey = user ? `${user.id}:${activeTab}` : null;
  const loading = requestKey !== null && requestKey !== loadedFor;

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      setCheckingAuth(false);
    });
  }, []);

  useEffect(() => {
    if (!user || requestKey === null) return;

    let cancelled = false;
    const supabase = createClient();

    // 관광지(F-05, TourAPI 기준)는 saved_places+places, 먹거리/놀거리(카카오 로컬
    // 결과, TourAPI contentId가 없음)는 별도 테이블 saved_kakao_places에서 읽는다.
    const query =
      activeTab === "place"
        ? supabase
            .from("saved_places")
            .select("id, place_id, places ( name, category, address )")
            .eq("user_id", user.id)
            .eq("type", "place")
            .order("created_at", { ascending: false })
            .returns<SavedPlaceRow[]>()
            .then(({ data }) =>
              (data ?? []).map((row) => ({
                id: row.id,
                name: row.places?.name ?? "이름 없음",
                category: row.places?.category ?? "관광지",
                address: row.places?.address ?? "",
              })),
            )
        : supabase
            .from("saved_kakao_places")
            .select("id, place_name, category_name, address_name")
            .eq("user_id", user.id)
            .eq("type", activeTab)
            .order("created_at", { ascending: false })
            .returns<SavedKakaoPlaceRow[]>()
            .then(({ data }) =>
              (data ?? []).map((row) => ({
                id: row.id,
                name: row.place_name,
                category: row.category_name,
                address: row.address_name,
              })),
            );

    query.then((mapped) => {
      if (cancelled) return;
      setItems(mapped);
      setLoadedFor(requestKey);
    });

    return () => {
      cancelled = true;
    };
  }, [user, activeTab, requestKey]);

  async function handleRemove(savedId: string) {
    setRemovingId(savedId);
    const supabase = createClient();
    const table = activeTab === "place" ? "saved_places" : "saved_kakao_places";
    const { error } = await supabase.from(table).delete().eq("id", savedId);

    setRemovingId(null);
    if (!error) {
      setItems((prev) => prev.filter((item) => item.id !== savedId));
    }
  }

  if (checkingAuth) {
    return null;
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center gap-4 py-16 text-center">
        <p className="text-[15px] font-semibold">로그인이 필요해요</p>
        <p className="text-[13.5px] text-text-muted">
          저장한 관광지·먹거리·놀거리는 로그인 후 확인할 수 있어요
        </p>
        <Link href="/login">
          <Button variant="primary">로그인하러 가기</Button>
        </Link>
      </div>
    );
  }

  const activeLabel = TABS.find((tab) => tab.value === activeTab)!.label;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="font-display font-bold text-2xl">저장함</p>
        <p className="mt-1.5 text-[13.5px] text-text-muted">
          저장해둔 곳을 모아서 다시 확인해보세요
        </p>
      </div>

      <Tabs tabs={TABS} value={activeTab} onChange={setActiveTab} />

      <div className="flex flex-col gap-3">
        {loading ? (
          <p className="py-10 text-center text-[13.5px] text-text-muted">
            불러오는 중...
          </p>
        ) : items.length === 0 ? (
          <p className="py-10 text-center text-[13.5px] text-text-muted">
            아직 저장한 {activeLabel}이 없어요
          </p>
        ) : (
          items.map((item) => (
            <SavedItemCard
              key={item.id}
              name={item.name}
              category={item.category}
              address={item.address}
              onRemove={() => handleRemove(item.id)}
              removing={removingId === item.id}
            />
          ))
        )}
      </div>
    </div>
  );
}
