"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { KakaoPlace } from "@/lib/kakao/local";
import { HeartToggle } from "./HeartToggle";

interface KakaoSaveButtonProps {
  item: KakaoPlace;
  type: "food" | "play";
}

export function KakaoSaveButton({ item, type }: KakaoSaveButtonProps) {
  const router = useRouter();
  const [saved, setSaved] = useState(false);
  const [savedRowId, setSavedRowId] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user || cancelled) return;
      const { data } = await supabase
        .from("saved_kakao_places")
        .select("id")
        .eq("user_id", user.id)
        .eq("kakao_place_id", item.id)
        .eq("type", type)
        .maybeSingle();
      if (!cancelled && data) {
        setSaved(true);
        setSavedRowId(data.id);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [item.id, type]);

  async function handleClick() {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      router.push("/login");
      return;
    }

    setPending(true);
    setError(null);
    if (saved && savedRowId) {
      const { error: deleteError } = await supabase
        .from("saved_kakao_places")
        .delete()
        .eq("id", savedRowId);
      if (deleteError) {
        setError("저장 취소에 실패했어요");
      } else {
        setSaved(false);
        setSavedRowId(null);
      }
    } else {
      const { data, error: upsertError } = await supabase
        .from("saved_kakao_places")
        .upsert(
          {
            user_id: user.id,
            kakao_place_id: item.id,
            type,
            place_name: item.placeName,
            category_name: item.categoryName,
            address_name: item.addressName,
            road_address_name: item.roadAddressName,
            phone: item.phone,
            place_url: item.placeUrl,
            longitude: item.longitude,
            latitude: item.latitude,
          },
          { onConflict: "user_id,kakao_place_id,type" },
        )
        .select("id")
        .single();
      if (upsertError || !data) {
        setError("저장에 실패했어요");
      } else {
        setSaved(true);
        setSavedRowId(data.id);
      }
    }
    setPending(false);
  }

  return (
    <div className="relative">
      <HeartToggle saved={saved} onClick={handleClick} disabled={pending} />
      {error && (
        <span className="absolute top-full right-0 z-10 mt-1 w-max rounded-md bg-bg-raised px-2 py-1 text-xs whitespace-nowrap text-primary shadow-sm border border-border">
          {error}
        </span>
      )}
    </div>
  );
}
