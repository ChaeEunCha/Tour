-- 업로드 사진에 EXIF GPS가 남아있는 경우, 전국 place_embeddings 전체가 아니라
-- 촬영 위치 반경 내 장소로만 후보를 좁힌 뒤 코사인 유사도를 매긴다.
-- (숲/공원처럼 서로 시각적으로 헷갈리는 장소들도 GPS로 후보군 자체를 좁히면
-- 엉뚱한 지역의 비슷하게 생긴 장소가 뽑히는 걸 원천적으로 막을 수 있다.)
-- PostGIS 확장 없이도 동작하도록 haversine 공식을 직접 계산한다.
create or replace function public.match_places_near(
  query_embedding vector(512),
  center_lat double precision,
  center_lng double precision,
  radius_km double precision default 5,
  match_count int default 4
)
returns table (
  place_id uuid,
  similarity float
)
language sql
stable
as $$
  select
    pe.place_id,
    max(1 - (pe.embedding <=> query_embedding)) as similarity
  from public.place_embeddings pe
  join public.places p on p.id = pe.place_id
  where p.latitude is not null
    and p.longitude is not null
    and (
      6371 * acos(
        greatest(-1, least(1,
          cos(radians(center_lat)) * cos(radians(p.latitude))
            * cos(radians(p.longitude) - radians(center_lng))
          + sin(radians(center_lat)) * sin(radians(p.latitude))
        ))
      )
    ) <= radius_km
  group by pe.place_id
  order by similarity desc
  limit match_count;
$$;
