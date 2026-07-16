-- F-03/F-04 매칭 엔진에 필요한 추가 스키마.
-- 20260716055239_init_schema.sql(팀 기본 스키마) 위에 얹는 추가분이며,
-- 기존 테이블의 컬럼/제약은 건드리지 않는다.

-- F-04(유사 매칭)는 상위 3건을 함께 반환해야 하므로, 검색 시점의 후보 3건 전체를
-- (place_id, similarity, accuracy 등) 그대로 보관해 결과 페이지에서 재조회한다.
-- matched_place_id/accuracy는 기존대로 최상위 1건을 계속 가리킨다.
alter table public.search_logs
  add column if not exists top_matches jsonb;

-- 업로드 이미지 저장용 Storage 버킷 (F-03/F-04 업로드 사진 보관)
insert into storage.buckets (id, name, public)
values ('uploads', 'uploads', true)
on conflict (id) do nothing;

-- 매칭 엔진은 service_role 키로만 호출하므로(위 place_embeddings 정책과 동일한 전제),
-- 버킷 정책은 공개 읽기만 열어두고 업로드는 service_role(RLS 우회)로 수행한다.
drop policy if exists "uploads bucket public read" on storage.objects;
create policy "uploads bucket public read" on storage.objects
  for select using (bucket_id = 'uploads');

-- 업로드 이미지와 가장 유사한 "장소" 상위 N건을 반환한다.
-- (같은 장소의 여러 이미지 중 최고 유사도만 사용해 장소 단위로 중복 없이 집계)
-- place_embeddings는 공개 select가 없으므로 이 함수는 반드시 service_role 클라이언트로만 호출한다.
create or replace function public.match_places(
  query_embedding vector(512),
  match_count int default 3
)
returns table (
  place_id uuid,
  similarity float
)
language sql
stable
as $$
  select
    place_id,
    max(1 - (embedding <=> query_embedding)) as similarity
  from public.place_embeddings
  group by place_id
  order by similarity desc
  limit match_count;
$$;
