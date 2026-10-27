-- =====================================================================
-- India Brasil – rastreamento do marketplace e números do painel do fornecedor (/portal)
-- Rode DEPOIS de marketplace-setup.sql, buyer-account.sql e chat-languages.sql.
-- Só ACRESCENTA colunas e funções e amplia a lista de eventos. Pode rodar mais de uma vez.
-- Como usar: Supabase > SQL Editor > New query > cole tudo > Run
-- =====================================================================

-- 1) Eventos mais completos: de qual fornecedor, de onde veio, quais produtos apareceram
alter table public.marketplace_events add column if not exists supplier_id uuid;
alter table public.marketplace_events add column if not exists product_ids uuid[];      -- produtos exibidos numa lista (impressões)
alter table public.marketplace_events add column if not exists source text check (source is null or length(source) <= 40);
alter table public.marketplace_events add column if not exists referrer text check (referrer is null or length(referrer) <= 200);
alter table public.marketplace_events add column if not exists utm_source text check (utm_source is null or length(utm_source) <= 100);
alter table public.marketplace_events add column if not exists utm_campaign text check (utm_campaign is null or length(utm_campaign) <= 100);
alter table public.marketplace_events add column if not exists device text check (device is null or device in ('mobile','desktop'));

alter table public.marketplace_events drop constraint if exists marketplace_events_event_check;
alter table public.marketplace_events add constraint marketplace_events_event_check check (event in (
  'view_home','search','view_product','add_to_list','start_quote','quote_sent','sample_sent','sourcing_sent','signup',
  'impressions','view_supplier','click_whatsapp'));
alter table public.marketplace_events drop constraint if exists marketplace_events_product_ids_size;
alter table public.marketplace_events add constraint marketplace_events_product_ids_size
  check (product_ids is null or array_length(product_ids, 1) <= 120);

create index if not exists marketplace_events_supplier_idx on public.marketplace_events (supplier_id, created_at desc);
create index if not exists marketplace_events_product_idx on public.marketplace_events (product_id, created_at desc);
create index if not exists marketplace_events_pids_idx on public.marketplace_events using gin (product_ids);

-- O fornecedor do evento vem do produto (o site não precisa mandar)
create or replace function public.marketplace_event_supplier()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  if new.supplier_id is null and new.product_id is not null then
    select p.supplier_id into new.supplier_id from public.products p where p.id = new.product_id;
  end if;
  return new;
end $$;
drop trigger if exists marketplace_event_supplier on public.marketplace_events;
create trigger marketplace_event_supplier before insert on public.marketplace_events
  for each row execute function public.marketplace_event_supplier();

-- 2) Caixa de entrada do fornecedor: última mensagem, não lidas e se já cotou, por pedido
create or replace function public.supplier_inbox()
returns table (rfq_id uuid, last_at timestamptz, last_role text, last_body text, unread bigint, quotes bigint)
language sql stable security definer
set search_path = ''
as $$
  select r.id, lm.created_at, lm.sender_role, left(lm.body, 160),
         (select count(*) from public.rfq_messages m
           where m.rfq_id = r.id and m.sender_role <> 'supplier'
             and m.created_at > coalesce(rd.last_read_at, '-infinity'::timestamptz)),
         (select count(*) from public.rfq_quotes q where q.rfq_id = r.id)
  from public.rfqs r
  left join public.rfq_reads rd on rd.rfq_id = r.id and rd.user_id = auth.uid()
  left join lateral (select m.created_at, m.sender_role, m.body from public.rfq_messages m
                     where m.rfq_id = r.id order by m.created_at desc limit 1) lm on true
  where public.has_2fa() and r.supplier_id in (select public.my_supplier_ids())
$$;
revoke all on function public.supplier_inbox() from public, anon;
grant execute on function public.supplier_inbox() to authenticated;

-- 3) Números do painel do fornecedor para um período (o próprio fornecedor ou a equipe India Brasil)
create or replace function public.supplier_dashboard(p_supplier uuid, p_days integer default 30)
returns jsonb
language plpgsql stable security definer
set search_path = ''
as $$
declare
  since timestamptz := now() - make_interval(days => greatest(1, least(p_days, 365)));
  prev  timestamptz := now() - make_interval(days => 2 * greatest(1, least(p_days, 365)));
  res jsonb;
begin
  if not (public.is_admin() or (public.has_2fa() and p_supplier in (select public.my_supplier_ids()))) then
    raise exception 'not allowed';
  end if;

  with prods as (select id, name, image_path, category from public.products where supplier_id = p_supplier and published),
  ev as (select * from public.marketplace_events where created_at >= prev and
           (supplier_id = p_supplier or product_ids && array(select id from prods))),
  imp as (select e.created_at, e.session, x.pid from ev e cross join lateral unnest(e.product_ids) as x(pid)
          where e.event = 'impressions' and x.pid in (select id from prods)),
  rf as (select r.*, (select min(m.created_at) from public.rfq_messages m where m.rfq_id = r.id and m.sender_role = 'supplier') as first_msg,
                     (select min(q.created_at) from public.rfq_quotes q where q.rfq_id = r.id) as first_quote
         from public.rfqs r where r.supplier_id = p_supplier and r.created_at >= prev),
  cur as (select
      (select count(*) from imp where created_at >= since) impressions,
      (select count(*) from ev where event = 'view_product' and created_at >= since) views,
      (select count(distinct session) from ev where event in ('view_product','view_supplier') and created_at >= since) visitors,
      (select count(*) from ev where event = 'view_supplier' and created_at >= since) storefront_views,
      (select count(*) from ev where event = 'start_quote' and created_at >= since) quote_starts,
      (select count(*) from ev where event = 'add_to_list' and created_at >= since) list_adds,
      (select count(*) from rf where created_at >= since) rfqs,
      (select count(*) from rf where created_at >= since and coalesce(first_msg, first_quote) is not null) answered,
      (select count(*) from public.rfq_quotes q join rf on rf.id = q.rfq_id where q.created_at >= since) quotes_sent,
      (select round(avg(extract(epoch from (least(coalesce(first_msg, first_quote), coalesce(first_quote, first_msg)) - created_at)) / 3600)::numeric, 1)
         from rf where created_at >= since and coalesce(first_msg, first_quote) is not null) avg_response_hours),
  prv as (select
      (select count(*) from imp where created_at < since) impressions,
      (select count(*) from ev where event = 'view_product' and created_at < since) views,
      (select count(*) from rf where created_at < since) rfqs)
  select jsonb_build_object(
    'days', p_days,
    'products_live', (select count(*) from prods),
    'impressions', cur.impressions, 'views', cur.views, 'visitors', cur.visitors,
    'storefront_views', cur.storefront_views, 'quote_starts', cur.quote_starts, 'list_adds', cur.list_adds,
    'rfqs', cur.rfqs, 'answered', cur.answered, 'quotes_sent', cur.quotes_sent, 'avg_response_hours', cur.avg_response_hours,
    'prev', jsonb_build_object('impressions', prv.impressions, 'views', prv.views, 'rfqs', prv.rfqs),
    'open_rfqs', (select count(*) from public.rfqs r where r.supplier_id = p_supplier and r.status = 'open'),
    'daily', (select coalesce(jsonb_agg(jsonb_build_object('d', d::date,
                  'views', (select count(*) from ev where event = 'view_product' and created_at::date = d::date),
                  'impressions', (select count(*) from imp where created_at::date = d::date),
                  'rfqs', (select count(*) from rf where created_at::date = d::date)) order by d), '[]'::jsonb)
              from generate_series(since::date, now()::date, interval '1 day') d),
    'products', (select coalesce(jsonb_agg(x order by (x->>'views')::int desc, (x->>'impressions')::int desc), '[]'::jsonb) from (
        select jsonb_build_object('id', p.id, 'name', p.name, 'image_path', p.image_path, 'category', p.category,
          'impressions', (select count(*) from imp where pid = p.id and created_at >= since),
          'views', (select count(*) from ev where event = 'view_product' and product_id = p.id and created_at >= since),
          'quote_starts', (select count(*) from ev where event = 'start_quote' and product_id = p.id and created_at >= since),
          'rfqs', (select count(*) from rf where product_id = p.id and created_at >= since)) x
        from prods p) t),
    'sources', (select coalesce(jsonb_object_agg(coalesce(s, 'direct'), n), '{}'::jsonb) from (
        select coalesce(utm_source, source) s, count(*) n from ev
        where event = 'view_product' and created_at >= since group by 1) t)
  ) into res
  from cur, prv;
  return res;
end $$;
revoke all on function public.supplier_dashboard(uuid, integer) from public, anon;
grant execute on function public.supplier_dashboard(uuid, integer) to authenticated;
