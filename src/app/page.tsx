import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-10 bg-zinc-50 px-6 py-24 dark:bg-black">
      <div className="text-center">
        <h1 className="text-3xl font-bold">어디있을까</h1>
        <p className="mt-2 text-zinc-500 dark:text-zinc-400">
          사진 한 장으로 그 장소를 다시 찾아보세요
        </p>
      </div>
      <div className="flex w-full max-w-sm flex-col gap-4">
        <Link
          href="/match/exact"
          className="rounded-full bg-foreground px-5 py-4 text-center font-medium text-background"
        >
          정확히 일치하는 곳 찾기
        </Link>
        <Link
          href="/match/similar"
          className="rounded-full border border-zinc-300 px-5 py-4 text-center font-medium dark:border-zinc-700"
        >
          유사한 관광지 찾기
        </Link>
      </div>
    </div>
  );
}
