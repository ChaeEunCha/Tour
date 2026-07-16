# 어디있을까 (Where Is It) — DB 설계

> 출처: [PRD.md](./PRD.md) §8 Supabase 데이터베이스 설계
> DB: Supabase Postgres + pgvector, 모든 테이블 Row Level Security(RLS) 적용

## 1. ERD 개요

```
auth.users (Supabase Auth 기본 제공)
  └─< saved_places (user_id)
  └─< search_logs (user_id)

places
  ├─< place_images (place_id)
  ├─< place_embeddings (place_id)
  ├─< saved_places (place_id)
  └─< search_logs (matched_place_id)
```

- `places` 1 : N `place_images` — 관광지 하나에 여러 참고 이미지
- `places` 1 : N `place_embeddings` — 이미지별 CLIP 임베딩(현재는 이미지 1장당 1개 가정)
- `auth.users` 1 : N `saved_places` — 사용자별 북마크
- `auth.users` 1 : N `search_logs` — 사용자별 검색 이력 (비로그인 검색 허용 시 `user_id` nullable)

---

## 2. 테이블 스키마

### 2.1 `places` — 관광지 마스터 정보 (TourAPI 기준)

| 컬럼 | 타입 | 제약 | 설명 |
|---|---|---|---|
| `id` | `uuid` | PK, `default gen_random_uuid()` | 내부 PK |
| `tour_content_id` | `text` | UNIQUE, NOT NULL | TourAPI `contentId` |
| `name` | `text` | NOT NULL | 관광지명 |
| `category` | `text` | NOT NULL | 카테고리 (관광지/문화시설 등) |
| `address` | `text` | NOT NULL | 주소 |
| `latitude` | `numeric` |  | 위도 (지도/주변검색용) |
| `longitude` | `numeric` |  | 경도 (지도/주변검색용) |
| `rating` | `numeric` | nullable | 평점 |
| `open_hours` | `text` | nullable | 운영시간 |
| `price` | `text` | nullable | 입장료 |
| `created_at` | `timestamptz` | `default now()` | 생성일시 |

### 2.2 `place_images` — 관광지별 참고 이미지

| 컬럼 | 타입 | 제약 | 설명 |
|---|---|---|---|
| `id` | `uuid` | PK, `default gen_random_uuid()` | |
| `place_id` | `uuid` | FK → `places.id`, NOT NULL, `on delete cascade` | |
| `image_url` | `text` | NOT NULL | Supabase Storage 경로/URL |
| `phash` | `text` | nullable | Perceptual Hash (MVP에서는 미사용, v2 대비 컬럼만 보존) |
| `created_at` | `timestamptz` | `default now()` | |

### 2.3 `place_embeddings` — CLIP 임베딩 (pgvector)

| 컬럼 | 타입 | 제약 | 설명 |
|---|---|---|---|
| `id` | `uuid` | PK, `default gen_random_uuid()` | |
| `place_id` | `uuid` | FK → `places.id`, NOT NULL, `on delete cascade` | |
| `place_image_id` | `uuid` | FK → `place_images.id`, NOT NULL, `on delete cascade` | 어떤 이미지에서 추출한 임베딩인지 |
| `embedding` | `vector(512)` | NOT NULL | CLIP ViT-B/32 임베딩 (512차원) |
| `created_at` | `timestamptz` | `default now()` | |

**인덱스:** 코사인 유사도 검색 성능을 위해 `ivfflat` 인덱스 생성

```sql
create extension if not exists vector;

create index place_embeddings_embedding_idx
  on place_embeddings
  using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);
```

### 2.4 `saved_places` — 사용자 북마크

| 컬럼 | 타입 | 제약 | 설명 |
|---|---|---|---|
| `id` | `uuid` | PK, `default gen_random_uuid()` | |
| `user_id` | `uuid` | FK → `auth.users.id`, NOT NULL, `on delete cascade` | |
| `place_id` | `uuid` | FK → `places.id`, NOT NULL, `on delete cascade` | |
| `type` | `text` | NOT NULL, `check (type in ('place','food','play'))` | 관광지/먹거리/놀거리 구분 |
| `created_at` | `timestamptz` | `default now()` | |

**유니크 제약:** `unique (user_id, place_id, type)` — 동일 사용자가 같은 장소를 같은 타입으로 중복 저장 방지 (F-08 upsert 대상)

### 2.5 `search_logs` — 검색 이력 (매칭 정확도 개선용, 선택)

| 컬럼 | 타입 | 제약 | 설명 |
|---|---|---|---|
| `id` | `uuid` | PK, `default gen_random_uuid()` | |
| `user_id` | `uuid` | FK → `auth.users.id`, nullable, `on delete set null` | 비로그인 검색 허용 시 null |
| `uploaded_image_url` | `text` | NOT NULL | 사용자가 업로드한 이미지 (Supabase Storage) |
| `matched_place_id` | `uuid` | FK → `places.id`, nullable | 결과 없음 상태가 없으므로 통상 NOT NULL이나, 매칭 실패 예외 상황 대비 nullable |
| `accuracy` | `numeric` | NOT NULL | 산출된 정확도(%) |
| `mode` | `text` | NOT NULL, `check (mode in ('exact','similar'))` | F-03/F-04 구분 |
| `created_at` | `timestamptz` | `default now()` | |

---

## 3. Row Level Security (RLS) 정책

| 테이블 | 정책 |
|---|---|
| `places` | 전체 공개 읽기(select) 허용, 쓰기는 서비스 롤(관리자/배치)만 |
| `place_images` | 전체 공개 읽기 허용, 쓰기는 서비스 롤만 |
| `place_embeddings` | 공개 select 불필요 — 서비스 롤(API Route)에서만 조회/쓰기 |
| `saved_places` | `select`/`insert`/`update`/`delete` 모두 `auth.uid() = user_id` 인 행만 허용 |
| `search_logs` | `select` `auth.uid() = user_id`인 행만 허용, `insert`는 로그인 사용자 본인 또는 서비스 롤(비로그인 로그 기록 시) |

예시 정책 (`saved_places`):

```sql
alter table saved_places enable row level security;

create policy "saved_places_select_own"
  on saved_places for select
  using (auth.uid() = user_id);

create policy "saved_places_insert_own"
  on saved_places for insert
  with check (auth.uid() = user_id);

create policy "saved_places_delete_own"
  on saved_places for delete
  using (auth.uid() = user_id);
```

---

## 4. 매칭 쿼리 예시 (F-03 / F-04)

```sql
select
  p.id,
  p.name,
  pi.image_url,
  1 - (pe.embedding <=> :query_embedding) as cosine_similarity
from place_embeddings pe
join places p on p.id = pe.place_id
join place_images pi on pi.id = pe.place_image_id
order by pe.embedding <=> :query_embedding
limit :top_n; -- F-03: 1, F-04: 3
```

`cosine_similarity` 값을 PRD §7의 변환식으로 0~100% 정확도로 환산하여 응답한다.

---

## 5. 참고

- `auth.users`는 Supabase Auth가 기본 제공하며 별도 정의 불필요
- `type` 컬럼은 초기엔 `text + check` 제약으로 관리, 값 종류가 늘어나면 Postgres `enum` 타입 전환 검토
- 환경변수/연동 정보는 [`.env.local.example`](./.env.local.example) 참고
