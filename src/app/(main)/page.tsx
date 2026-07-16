import { HomeActionCard } from "@/components/layout/HomeActionCard";
import { Mascot } from "@/components/layout/Mascot";

export default function HomePage() {
  return (
    <div className="flex flex-1 flex-col justify-center gap-8">
      <Mascot size={132} className="self-center" />

      <div className="text-center">
        <p className="font-display font-bold text-2xl text-balance">
          어디였는지, 사진 한 장이면 충분해요
        </p>
        <p className="mt-2 text-[14px] text-text-muted">
          찾고 싶은 사진을 올리거나, 저장해둔 곳을 다시 확인해보세요
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <HomeActionCard
          href="/match/exact"
          title="정확한 곳 찾기"
          description="사진 속 그 장소를 정확도와 함께 찾아드려요"
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <circle cx="12" cy="12" r="9" />
              <circle cx="12" cy="12" r="3.2" />
            </svg>
          }
        />
        <HomeActionCard
          href="/match/similar"
          title="유사한 관광지 찾기"
          description="비슷한 분위기의 후보 3곳을 보여드려요"
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <rect x="4" y="4" width="16" height="16" rx="3" />
              <path d="M4 15l4.5-4.5L12 14l3-3 5 5" />
            </svg>
          }
        />
        <HomeActionCard
          href="/mypage"
          title="저장함"
          description="북마크한 관광지·먹거리·놀거리를 모아봐요"
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M6 3h12v18l-6-4-6 4V3z" />
            </svg>
          }
        />
      </div>
    </div>
  );
}
