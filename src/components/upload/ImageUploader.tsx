"use client";

import { useRef, useState } from "react";
import { MapSearchLoading } from "@/components/upload/MapSearchLoading";
import { Button } from "@/components/ui/Button";

interface ImageUploaderProps {
  onSubmit: (file: File) => Promise<void>;
  submitLabel: string;
}

export function ImageUploader({ onSubmit, submitLabel }: ImageUploaderProps) {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0] ?? null;
    setFile(selected);
    setError(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(selected ? URL.createObjectURL(selected) : null);
  }

  async function handleSubmit() {
    if (!file) {
      setError("사진을 선택해주세요.");
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      await onSubmit(file);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "알 수 없는 오류가 발생했어요."
      );
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex w-full max-w-md flex-col items-center gap-4">
      {isSubmitting && <MapSearchLoading message="장소를 찾고 있어요!" />}
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="flex h-64 w-full items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-zinc-300 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900"
      >
        {previewUrl ? (
          // 로컬 blob 미리보기이므로 next/image 대신 일반 img 사용
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={previewUrl}
            alt="업로드 미리보기"
            className="h-full w-full object-cover"
          />
        ) : (
          <span className="text-zinc-500 dark:text-zinc-400">
            탭해서 사진 선택
          </span>
        )}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleFileChange}
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <Button
        type="button"
        onClick={handleSubmit}
        disabled={!file || isSubmitting}
        className="w-full"
      >
        {isSubmitting ? "찾는 중..." : submitLabel}
      </Button>
    </div>
  );
}
