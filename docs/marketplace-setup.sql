-- =====================================================================
-- India Brasil – Marketplace (/marketplace), área do comprador (/comprador)
-- e conversas B2B com anexos.
-- Rode DEPOIS de supabase-setup.sql, admin-setup.sql e portal-setup.sql.
-- Só ACRESCENTA tabelas, colunas, funções e regras; não apaga nada.
-- Como usar: Supabase > SQL Editor > New query > cole tudo > Run
-- Pode rodar mais de uma vez sem problema.
-- =====================================================================

-- 1) Produtos do marketplace (gerados a partir do resumo padronizado do catálogo)
create table if not exists public.products (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz not null default now(),
  supplier_id   uuid not null references public.suppliers (id) on delete cascade,
  reference     text not null,               -- referência do fornecedor (IB-XXXX)
  code          text,                        -- código do produto no catálogo
  name          text not null,
  category      text,
  description   text,
  image_path    text,                        -- arquivo no bucket público product-images
  price_min     numeric,
  price_max     numeric,
  currency      text,
  price_unit    text,
  moq           text,
  specs         jsonb not null default '{}',
  variants      jsonb not null default '[]',
  variant_count integer not null default 0,
  certifications text[] not null default '{}',
  source        text,
  published     boolean not null default true
);
create index if not exists products_supplier_idx on public.products (supplier_id);
create index if not exists products_category_idx on public.products (category) where published;
alter table public.products enable row level security;

drop policy if exists "anyone reads published products" on public.products;
create policy "anyone reads published products"
  on public.products for select to anon, authenticated
  using (published);

drop policy if exists "admins manage products" on public.products;
create policy "admins manage products"
  on public.products for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "supplier reads own products" on public.products;
create policy "supplier reads own products"
  on public.products for select to authenticated
  using (public.has_2fa() and supplier_id in (select public.my_supplier_ids()));

-- 2) Vitrine pública do fornecedor: só dados sem contato (o meio de campo é da India Brasil)
create or replace view public.marketplace_suppliers as
select s.id, s.reference, s.state, s.business_type, s.year_established,
       s.certifications, s.categories, s.export_turnover,
       (s.status in ('verified','published')) as verified
from public.suppliers s
where exists (select 1 from public.products p where p.supplier_id = s.id and p.published);

grant select on public.marketplace_suppliers to anon, authenticated;

-- 3) Publicar / tirar do ar o catálogo de um fornecedor (botão no /admin)
create or replace function public.publish_catalogue(p_supplier uuid)
returns integer
language plpgsql security definer
set search_path = ''
as $$
declare
  v_sum jsonb; v_ref text; v_n integer;
begin
  if not public.is_admin() then raise exception 'not allowed'; end if;
  select c.summary, s.reference into v_sum, v_ref
  from public.catalogue_summaries c join public.suppliers s on s.id = c.supplier_id
  where c.supplier_id = p_supplier;
  if v_sum is null then raise exception 'Este fornecedor ainda não tem resumo do catálogo'; end if;

  delete from public.products where supplier_id = p_supplier;
  insert into public.products (supplier_id, reference, code, name, category, description, image_path,
    price_min, price_max, currency, price_unit, moq, specs, variants, variant_count, certifications, source)
  select p_supplier, v_ref,
    coalesce(p->'specs'->>'Código', p->>'code'),
    p->>'name', p->>'category', p->>'description', p->>'image',
    nullif(p->>'price_min','')::numeric, nullif(p->>'price_max','')::numeric,
    v_sum->>'currency', p->>'price_unit', p->>'moq',
    coalesce(p->'specs','{}'::jsonb), coalesce(p->'variants','[]'::jsonb),
    jsonb_array_length(coalesce(p->'variants','[]'::jsonb)),
    coalesce(array(select jsonb_array_elements_text(coalesce(p->'certifications','[]'::jsonb))), '{}'),
    p->>'source'
  from jsonb_array_elements(coalesce(v_sum->'products','[]'::jsonb)) p
  where coalesce(p->>'name','') <> '';
  get diagnostics v_n = row_count;

  update public.suppliers set status = 'published' where id = p_supplier;
  return v_n;
end $$;

create or replace function public.unpublish_catalogue(p_supplier uuid)
returns integer
language plpgsql security definer
set search_path = ''
as $$
declare v_n integer;
begin
  if not public.is_admin() then raise exception 'not allowed'; end if;
  update public.products set published = false where supplier_id = p_supplier;
  get diagnostics v_n = row_count;
  update public.suppliers set status = 'verified' where id = p_supplier and status = 'published';
  return v_n;
end $$;

revoke all on function public.publish_catalogue(uuid) from public, anon;
revoke all on function public.unpublish_catalogue(uuid) from public, anon;
grant execute on function public.publish_catalogue(uuid) to authenticated;
grant execute on function public.unpublish_catalogue(uuid) to authenticated;

-- 4) Compradores brasileiros com conta própria (cadastro em /comprador)
alter table public.buyers add column if not exists user_id uuid unique references auth.users (id) on delete set null;
alter table public.buyers add column if not exists cnpj text;
alter table public.buyers add column if not exists segment text;

create or replace function public.my_buyer_id()
returns uuid
language sql stable security definer
set search_path = ''
as $$ select id from public.buyers where user_id = auth.uid() limit 1 $$;
revoke all on function public.my_buyer_id() from public, anon;
grant execute on function public.my_buyer_id() to authenticated;

drop policy if exists "buyer reads own profile" on public.buyers;
create policy "buyer reads own profile"
  on public.buyers for select to authenticated using (user_id = auth.uid());

drop policy if exists "buyer creates own profile" on public.buyers;
create policy "buyer creates own profile"
  on public.buyers for insert to authenticated with check (user_id = auth.uid());

drop policy if exists "buyer updates own profile" on public.buyers;
create policy "buyer updates own profile"
  on public.buyers for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- 5) Pedido de orçamento feito pelo comprador no marketplace
alter table public.rfqs add column if not exists product_id uuid references public.products (id) on delete set null;
alter table public.rfqs add column if not exists origin text not null default 'team';

drop policy if exists "buyer reads own rfqs" on public.rfqs;
create policy "buyer reads own rfqs"
  on public.rfqs for select to authenticated
  using (buyer_id = public.my_buyer_id());

drop policy if exists "buyer requests quotes" on public.rfqs;
create policy "buyer requests quotes"
  on public.rfqs for insert to authenticated
  with check (
    buyer_id = public.my_buyer_id() and status = 'open'
    and exists (select 1 from public.products p
                where p.id = product_id and p.published and p.supplier_id = rfqs.supplier_id)
  );

-- O fornecedor vê só "Buyer from <cidade>/<UF>, Brazil" (sem nome nem contato)
create or replace function public.rfq_from_buyer()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
declare b public.buyers;
begin
  select * into b from public.buyers where id = new.buyer_id;
  if b.user_id is not null and b.user_id = auth.uid() then
    new.origin := 'marketplace';
    new.buyer_label := 'Buyer from ' || coalesce(nullif(b.city,''), 'Brazil')
                       || coalesce('/' || nullif(b.state,''), '') || ', Brazil';
  end if;
  return new;
end $$;

drop trigger if exists rfq_from_buyer on public.rfqs;
create trigger rfq_from_buyer before insert on public.rfqs
  for each row execute function public.rfq_from_buyer();

drop policy if exists "buyer reads quotes" on public.rfq_quotes;
create policy "buyer reads quotes"
  on public.rfq_quotes for select to authenticated
  using (rfq_id in (select id from public.rfqs where buyer_id = public.my_buyer_id()));

-- 6) Conversa B2B: o comprador participa e as mensagens podem ter anexo
alter table public.rfq_messages add column if not exists attachment_path text;
alter table public.rfq_messages add column if not exists attachment_name text;
alter table public.rfq_messages add column if not exists attachment_size bigint;
do $$ begin
  alter table public.rfq_messages add constraint rfq_messages_attachment_in_rfq
    check (attachment_path is null or attachment_path like rfq_id::text || '/%');
exception when duplicate_object then null;
end $$;

drop policy if exists "buyer reads messages" on public.rfq_messages;
create policy "buyer reads messages"
  on public.rfq_messages for select to authenticated
  using (rfq_id in (select id from public.rfqs where buyer_id = public.my_buyer_id()));

drop policy if exists "buyer sends messages" on public.rfq_messages;
create policy "buyer sends messages"
  on public.rfq_messages for insert to authenticated
  with check (sender_role = 'buyer'
              and rfq_id in (select id from public.rfqs where buyer_id = public.my_buyer_id()));

-- Nome de quem escreve: fornecedor = empresa do cadastro; comprador logado = rótulo do pedido
create or replace function public.rfq_message_sender()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  if new.sender_role = 'supplier' then
    select s.company_name into new.sender_name
    from public.rfqs r join public.suppliers s on s.id = r.supplier_id
    where r.id = new.rfq_id;
  elsif new.sender_role = 'buyer' and exists (
      select 1 from public.rfqs r join public.buyers b on b.id = r.buyer_id
      where r.id = new.rfq_id and b.user_id = auth.uid()) then
    select r.buyer_label into new.sender_name from public.rfqs r where r.id = new.rfq_id;
  end if;
  new.sender_user := auth.uid();
  return new;
end $$;

-- Quem participa de um pedido: time, fornecedor (com 2FA) ou o comprador dono
create or replace function public.can_access_rfq(p_rfq text)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select public.is_admin() or exists (
    select 1 from public.rfqs r
    where r.id::text = p_rfq
      and ((public.has_2fa() and r.supplier_id in (select public.my_supplier_ids()))
           or (r.buyer_id is not null and r.buyer_id = public.my_buyer_id())))
$$;
revoke all on function public.can_access_rfq(text) from public, anon;
grant execute on function public.can_access_rfq(text) to authenticated;

-- 7) Arquivos
-- Fotos dos produtos: públicas (só o script com a secret key envia)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('product-images', 'product-images', true, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

-- Anexos das conversas: privados, só participantes do pedido
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('rfq-files', 'rfq-files', false, 15728640, array[
  'application/pdf','image/jpeg','image/png','image/webp',
  'application/vnd.ms-excel','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-powerpoint','application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain','text/csv'])
on conflict (id) do nothing;

drop policy if exists "rfq participants read files" on storage.objects;
create policy "rfq participants read files"
  on storage.objects for select to authenticated
  using (bucket_id = 'rfq-files' and public.can_access_rfq((storage.foldername(name))[1]));

drop policy if exists "rfq participants upload files" on storage.objects;
create policy "rfq participants upload files"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'rfq-files' and public.can_access_rfq((storage.foldername(name))[1]));

-- 8) Conversão: pedido de amostra, pedido livre (sem produto) e funil
-- Tipo do pedido: cotação ou amostra (amostra = menor compromisso, ajuda a fechar o primeiro negócio)
alter table public.rfqs add column if not exists request_type text not null default 'quote';
do $$ begin
  alter table public.rfqs add constraint rfqs_request_type check (request_type in ('quote','sample'));
exception when duplicate_object then null;
end $$;

-- Pedido livre: o comprador descreve o que precisa e a equipe encontra fornecedores
-- (vira um ou mais RFQs com sourcing_id apontando para cá)
create table if not exists public.sourcing_requests (
  id           uuid primary key default gen_random_uuid(),
  code         text not null unique default ('REQ-' || upper(substr(md5(random()::text), 1, 6))),
  created_at   timestamptz not null default now(),
  buyer_id     uuid not null references public.buyers (id) on delete cascade,
  title        text not null check (length(btrim(title)) between 3 and 200),
  category     text,
  quantity     numeric,
  unit         text,
  target_price numeric,
  currency     text default 'USD',
  destination  text,
  needed_by    date,
  details      text check (details is null or length(details) <= 4000),
  status       text not null default 'open' check (status in ('open','matching','sent','closed')),
  team_notes   text
);
alter table public.sourcing_requests enable row level security;
revoke all on public.sourcing_requests from anon;

drop policy if exists "admins manage sourcing" on public.sourcing_requests;
create policy "admins manage sourcing"
  on public.sourcing_requests for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "buyer reads own sourcing" on public.sourcing_requests;
create policy "buyer reads own sourcing"
  on public.sourcing_requests for select to authenticated
  using (buyer_id = public.my_buyer_id());

drop policy if exists "buyer creates sourcing" on public.sourcing_requests;
create policy "buyer creates sourcing"
  on public.sourcing_requests for insert to authenticated
  with check (buyer_id = public.my_buyer_id() and status = 'open' and team_notes is null);

alter table public.rfqs add column if not exists sourcing_id uuid references public.sourcing_requests (id) on delete set null;

-- Funil do marketplace: eventos anônimos (sem dados pessoais) para medir a conversão
create table if not exists public.marketplace_events (
  id         bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  session    text check (length(session) <= 64),
  event      text not null check (event in ('view_home','search','view_product','add_to_list','start_quote',
                                            'quote_sent','sample_sent','sourcing_sent','signup')),
  product_id uuid,
  query      text check (length(query) <= 200)
);
create index if not exists marketplace_events_created_idx on public.marketplace_events (created_at desc, event);
alter table public.marketplace_events enable row level security;

drop policy if exists "anyone logs events" on public.marketplace_events;
create policy "anyone logs events"
  on public.marketplace_events for insert to anon, authenticated with check (true);

drop policy if exists "admins read events" on public.marketplace_events;
create policy "admins read events"
  on public.marketplace_events for select to authenticated using (public.is_admin());

grant insert on public.marketplace_events to anon, authenticated;

-- O comprador não pode ligar o próprio pedido a um pedido livre (isso é trabalho da equipe)
drop policy if exists "buyer requests quotes" on public.rfqs;
create policy "buyer requests quotes"
  on public.rfqs for insert to authenticated
  with check (
    buyer_id = public.my_buyer_id() and status = 'open' and sourcing_id is null
    and exists (select 1 from public.products p
                where p.id = product_id and p.published and p.supplier_id = rfqs.supplier_id)
  );
