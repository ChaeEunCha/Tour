-- extensions
create extension if not exists vector;
create extension if not exists pgcrypto;

-- places: 관광지 마스터 정보 (TourAPI 기준)
create table if not exists places (
  id uuid primary key default gen_random_uuid(),
  tour_content_id text not null unique,
  name text not null,
  category text not null,
  address text not null,
  latitude numeric,
  longitude numeric,
  rating numeric,
  open_hours text,
  price text,
  created_at timestamptz not null default now()
);

-- place_images: 관광지별 참고 이미지
create table if not exists place_images (
  id uuid primary key default gen_random_uuid(),
  place_id uuid not null references places(id) on delete cascade,
  image_url text not null,
  phash text,
  created_at timestamptz not null default now()
);

-- place_embeddings: CLIP ViT-B/32 임베딩 (pgvector)
create table if not exists place_embeddings (
  id uuid primary key default gen_random_uuid(),
  place_id uuid not null references places(id) on delete cascade,
  place_image_id uuid not null references place_images(id) on delete cascade,
  embedding vector(512) not null,
  created_at timestamptz not null default now()
);

create index if not exists place_embeddings_embedding_idx
  on place_embeddings
  using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

-- saved_places: 사용자 북마크 (관광지/먹거리/놀거리)
create table if not exists saved_places (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  place_id uuid not null references places(id) on delete cascade,
  type text not null check (type in ('place', 'food', 'play')),
  created_at timestamptz not null default now(),
  unique (user_id, place_id, type)
);

-- search_logs: 검색 이력 (매칭 정확도 개선용)
create table if not exists search_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  uploaded_image_url text not null,
  matched_place_id uuid references places(id) on delete set null,
  accuracy numeric not null,
  mode text not null check (mode in ('exact', 'similar')),
  created_at timestamptz not null default now()
);

-- RLS
alter table places enable row level security;
alter table place_images enable row level security;
alter table place_embeddings enable row level security;
alter table saved_places enable row level security;
alter table search_logs enable row level security;

-- places / place_images: 공개 읽기 허용, 쓰기는 service_role만 (정책 미생성 = 기본 차단)
create policy "places_public_read"
  on places for select
  using (true);

create policy "place_images_public_read"
  on place_images for select
  using (true);

-- place_embeddings: 공개 select 없음 (service_role만 접근, RLS enable로 기본 차단)

-- saved_places: 본인 데이터만 CRUD
create policy "saved_places_select_own"
  on saved_places for select
  using (auth.uid() = user_id);

create policy "saved_places_insert_own"
  on saved_places for insert
  with check (auth.uid() = user_id);

create policy "saved_places_update_own"
  on saved_places for update
  using (auth.uid() = user_id);

create policy "saved_places_delete_own"
  on saved_places for delete
  using (auth.uid() = user_id);

-- search_logs: 본인 데이터만 조회/기록
create policy "search_logs_select_own"
  on search_logs for select
  using (auth.uid() = user_id);

create policy "search_logs_insert_own"
  on search_logs for insert
  with check (auth.uid() = user_id or user_id is null);
