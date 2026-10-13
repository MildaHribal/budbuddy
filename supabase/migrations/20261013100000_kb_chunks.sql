-- Server-side knowledge search for the AI assistant (apps without the on-device pack).
-- Rows come from scripts/kb-ingest.mjs; embeddings are gte-small (384 dims, mean pool, normalized).
-- Read only by the kb-search edge function with the service role.

create extension if not exists vector with schema extensions;

create table if not exists public.kb_chunks (
  id text primary key,
  title text not null,
  text text not null,
  topic text,
  source text,
  license text,
  url text,
  lang text not null default 'en',
  embedding extensions.vector(384) not null,
  tsv tsvector generated always as (
    setweight(to_tsvector('english', coalesce(title, '')), 'A') || setweight(to_tsvector('english', coalesce(text, '')), 'B')
  ) stored,
  updated_at timestamptz not null default now()
);

create index if not exists kb_chunks_embedding_idx on public.kb_chunks using hnsw (embedding extensions.vector_cosine_ops);
create index if not exists kb_chunks_tsv_idx on public.kb_chunks using gin (tsv);

alter table public.kb_chunks enable row level security;
revoke all on public.kb_chunks from public, anon, authenticated;
grant select, insert, update, delete on public.kb_chunks to service_role;

-- Hybrid retrieval: vector top 50 + full-text top 50 (any query word, ranked), fused with RRF (k = 60).
create or replace function public.kb_search(query_embedding extensions.vector(384), query_text text, k int default 8)
returns table (id text, title text, text text, source text, url text, license text, topic text, lang text, score double precision)
language sql stable
set search_path = public, extensions
set hnsw.ef_search = 100
as $$
  with q as (
    select nullif(replace(websearch_to_tsquery('english', coalesce(query_text, ''))::text, ' & ', ' | '), '')::tsquery as tsq
  ),
  vec as (
    select c.id, row_number() over (order by c.embedding <=> query_embedding) as r
    from public.kb_chunks c
    order by c.embedding <=> query_embedding
    limit 50
  ),
  fts as (
    select c.id, row_number() over (order by ts_rank_cd(c.tsv, q.tsq, 32) desc) as r
    from public.kb_chunks c, q
    where q.tsq is not null and c.tsv @@ q.tsq
    order by ts_rank_cd(c.tsv, q.tsq, 32) desc
    limit 50
  ),
  fused as (
    select coalesce(v.id, f.id) as id, coalesce(1.0 / (60 + v.r), 0) + coalesce(1.0 / (60 + f.r), 0) as score
    from vec v full join fts f on f.id = v.id
  )
  select c.id, c.title, c.text, c.source, c.url, c.license, c.topic, c.lang, fu.score::double precision
  from fused fu join public.kb_chunks c on c.id = fu.id
  order by fu.score desc, c.id
  limit least(greatest(coalesce(k, 8), 1), 50)
$$;

revoke execute on function public.kb_search(extensions.vector, text, int) from public, anon, authenticated;
grant execute on function public.kb_search(extensions.vector, text, int) to service_role;
