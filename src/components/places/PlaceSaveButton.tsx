"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { HeartToggle } from "./HeartToggle";

interface PlaceSaveButtonProps {
  tourContentId: string;
  name: string;
  category: string;
  address: string;
  latitude: number;
  longitude: number;
}

export function PlaceSaveButton({
  tourContentId,
  name,
  category,
  address,
  latitude,
  longitude,
}: PlaceSaveButtonProps) {
  const router = useRouter();
  const [saved, setSaved] = useState(false);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/saved/place?tourContentId=${encodeURIComponent(tourContentId)}`)
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) setSaved(Boolean(data.saved));
      });
    return () => {
      cancelled = true;
    };
  }, [tourContentId]);

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
    if (saved) {
      const res = await fetch(
        `/api/saved/place?tourContentId=${encodeURIComponent(tourContentId)}`,
        { method: "DELETE" },
      );
      if (res.ok) setSaved(false);
    } else {
      const res = await fetch("/api/saved/place", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tourContentId, name, category, address, latitude, longitude }),
      });
      if (res.ok) setSaved(true);
    }
    setPending(false);
  }

  return <HeartToggle saved={saved} onClick={handleClick} disabled={pending} />;
}
