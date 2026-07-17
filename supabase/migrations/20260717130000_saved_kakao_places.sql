-- 먹거리/놀거리 하트 저장: 카카오 로컬 API 결과는 TourAPI contentId가 없어
-- tour_content_id NOT NULL UNIQUE인 places 테이블에 넣을 수 없다. places는
-- TourAPI 전용으로 그대로 두고, 카카오 장소 전용 저장 테이블을 분리한다.
create table if not exists saved_kakao_places (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kakao_place_id text not null,
  type text not null check (type in ('food', 'play')),
  place_name text not null,
  category_name text not null,
  address_name text not null,
  road_address_name text not null,
  phone text not null,
  place_url text not null,
  longitude numeric not null,
  latitude numeric not null,
  created_at timestamptz not null default now(),
  unique (user_id, kakao_place_id, type)
);

alter table saved_kakao_places enable row level security;

create policy "saved_kakao_places_select_own"
  on saved_kakao_places for select
  using (auth.uid() = user_id);

create policy "saved_kakao_places_insert_own"
  on saved_kakao_places for insert
  with check (auth.uid() = user_id);

create policy "saved_kakao_places_delete_own"
  on saved_kakao_places for delete
  using (auth.uid() = user_id);
