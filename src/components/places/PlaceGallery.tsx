import Image from "next/image";

export function PlaceGallery({ images, title }: { images: string[]; title: string }) {
  if (images.length <= 1) return null;

  return (
    <div className="grid grid-cols-3 gap-2">
      {images.slice(1, 7).map((url) => (
        <div key={url} className="relative aspect-square overflow-hidden rounded-[12px]">
          <Image src={url} alt={title} fill sizes="33vw" className="object-cover" />
        </div>
      ))}
    </div>
  );
}
