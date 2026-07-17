import { notFound } from "next/navigation";
import { PlaceMap } from "@/components/map/PlaceMap";
import { NearbyList } from "@/components/places/NearbyList";
import { PlaceDetailCard } from "@/components/places/PlaceDetailCard";
import { PlaceGallery } from "@/components/places/PlaceGallery";
import { searchNearby } from "@/lib/kakao/local";
import { getPlaceDetail } from "@/lib/tourapi/places";

export default async function PlacePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const place = await getPlaceDetail(id);
  if (!place) {
    notFound();
  }

  const nearby = await searchNearby(place.longitude, place.latitude, 1000).catch(
    () => ({ food: [], play: [] }),
  );

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 bg-bg p-4 pb-16">
      <PlaceDetailCard place={place} />
      <PlaceGallery images={place.images} title={place.title} />
      <PlaceMap place={place} food={nearby.food} play={nearby.play} />
      <NearbyList food={nearby.food} play={nearby.play} />
    </main>
  );
}
