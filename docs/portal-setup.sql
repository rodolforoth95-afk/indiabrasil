-- =====================================================================
-- India Brazil – Portal do fornecedor (/portal) e orçamentos (/admin-orcamentos)
-- Rode DEPOIS do supabase-setup.sql e do admin-setup.sql.
-- Só ACRESCENTA tabelas, funções e regras novas; não altera nada que já existe.
-- Como usar: Supabase > SQL Editor > New query > cole tudo > Run
-- Pode rodar mais de uma vez sem problema.
-- =====================================================================

-- 1) Quem é o fornecedor logado?
--    O login do portal é ligado ao cadastro pelo e-mail (o mesmo do formulário /register),
--    e só depois que o fornecedor confirma esse e-mail.
create or replace function public.my_supplier_ids()
returns setof uuid
language sql stable security definer
set search_path = ''
as $$
  select s.id
  from public.suppliers s
  join auth.users u on u.id = auth.uid()
  where u.email_confirmed_at is not null
    and lower(s.email) = lower(u.email)
$$;

-- Login com verificação em duas etapas concluída (senha + código do app autenticador)
create or replace function public.has_2fa()
returns boolean
language sql stable
set search_path = ''
as $$ select coalesce((auth.jwt() ->> 'aal') = 'aal2', false) $$;

revoke all on function public.my_supplier_ids() from public, anon;
revoke all on function public.has_2fa() from public, anon;
grant execute on function public.my_supplier_ids() to authenticated;
grant execute on function public.has_2fa() to authenticated;

-- 2) O fornecedor vê o próprio cadastro, catálogos e resumos (só com 2FA)
drop policy if exists "supplier reads own registration" on public.suppliers;
create policy "supplier reads own registration"
  on public.suppliers for select to authenticated
  using (public.has_2fa() and id in (select public.my_supplier_ids()));

drop policy if exists "supplier reads own summary" on public.catalogue_summaries;
create policy "supplier reads own summary"
  on public.catalogue_summaries for select to authenticated
  using (public.has_2fa() and supplier_id in (select public.my_supplier_ids()));

drop policy if exists "supplier reads own job" on public.catalogue_jobs;
create policy "supplier reads own job"
  on public.catalogue_jobs for select to authenticated
  using (public.has_2fa() and supplier_id in (select public.my_supplier_ids()));

drop policy if exists "supplier reads own catalogues" on storage.objects;
create policy "supplier reads own catalogues"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'catalogues' and public.has_2fa()
    and (storage.foldername(name))[1] in (
      select reference from public.suppliers where id in (select public.my_supplier_ids())
    )
  );

-- 3) Compradores brasileiros (só o time India Brazil vê os dados de contato)
create table if not exists public.buyers (
  id           uuid primary key default gen_random_uuid(),
  created_at   timestamptz not null default now(),
  company_name text not null,
  contact_name text,
  email        text,
  phone        text,
  city         text,
  state        text,
  notes        text
);
alter table public.buyers enable row level security;
revoke all on public.buyers from anon;

drop policy if exists "admins manage buyers" on public.buyers;
create policy "admins manage buyers"
  on public.buyers for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- 4) Pedidos de orçamento (RFQs) enviados a um fornecedor
create table if not exists public.rfqs (
  id           uuid primary key default gen_random_uuid(),
  code         text not null unique default ('RFQ-' || upper(substr(md5(random()::text), 1, 6))),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  supplier_id  uuid not null references public.suppliers (id) on delete cascade,
  buyer_id     uuid references public.buyers (id) on delete set null,
  buyer_label  text not null,          -- o que o fornecedor vê, ex.: "Distribuidor de têxteis – São Paulo"
  product      text not null,
  details      text,
  quantity     numeric,
  unit         text,
  target_price numeric,
  currency     text default 'USD',
  incoterm     text,
  destination  text,
  needed_by    date,
  status       text not null default 'open'
               check (status in ('open','quoted','negotiating','won','lost','closed'))
);
create index if not exists rfqs_supplier_idx on public.rfqs (supplier_id, created_at desc);
alter table public.rfqs enable row level security;
revoke all on public.rfqs from anon;

drop policy if exists "admins manage rfqs" on public.rfqs;
create policy "admins manage rfqs"
  on public.rfqs for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "supplier reads own rfqs" on public.rfqs;
create policy "supplier reads own rfqs"
  on public.rfqs for select to authenticated
  using (public.has_2fa() and supplier_id in (select public.my_supplier_ids()));

-- 5) Cotações que o fornecedor envia para um RFQ
create table if not exists public.rfq_quotes (
  id             uuid primary key default gen_random_uuid(),
  created_at     timestamptz not null default now(),
  rfq_id         uuid not null references public.rfqs (id) on delete cascade,
  supplier_id    uuid not null references public.suppliers (id) on delete cascade,
  created_by     uuid default auth.uid(),
  unit_price     numeric not null check (unit_price > 0),
  currency       text not null default 'USD',
  moq            text,
  lead_time_days integer check (lead_time_days is null or lead_time_days between 0 and 730),
  incoterm       text,
  valid_until    date,
  notes          text check (notes is null or length(notes) <= 4000)
);
create index if not exists rfq_quotes_rfq_idx on public.rfq_quotes (rfq_id, created_at desc);
alter table public.rfq_quotes enable row level security;
revoke all on public.rfq_quotes from anon;

drop policy if exists "admins manage quotes" on public.rfq_quotes;
create policy "admins manage quotes"
  on public.rfq_quotes for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "supplier reads own quotes" on public.rfq_quotes;
create policy "supplier reads own quotes"
  on public.rfq_quotes for select to authenticated
  using (public.has_2fa() and supplier_id in (select public.my_supplier_ids()));

drop policy if exists "supplier sends quotes" on public.rfq_quotes;
create policy "supplier sends quotes"
  on public.rfq_quotes for insert to authenticated
  with check (
    public.has_2fa()
    and supplier_id in (select public.my_supplier_ids())
    and exists (select 1 from public.rfqs r
                where r.id = rfq_id and r.supplier_id = rfq_quotes.supplier_id
                  and r.status in ('open','quoted','negotiating'))
  );

-- Ao receber a primeira cotação, o RFQ passa de "open" para "quoted"
create or replace function public.rfq_quote_received()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  update public.rfqs set status = 'quoted', updated_at = now()
  where id = new.rfq_id and status = 'open';
  return new;
end $$;

drop trigger if exists rfq_quote_received on public.rfq_quotes;
create trigger rfq_quote_received after insert on public.rfq_quotes
  for each row execute function public.rfq_quote_received();

-- 6) Chat de cada RFQ entre fornecedor, comprador e time India Brazil
create table if not exists public.rfq_messages (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  rfq_id      uuid not null references public.rfqs (id) on delete cascade,
  sender_role text not null check (sender_role in ('supplier','buyer','team')),
  sender_name text,
  sender_user uuid default auth.uid(),
  body        text not null check (length(btrim(body)) between 1 and 4000)
);
create index if not exists rfq_messages_rfq_idx on public.rfq_messages (rfq_id, created_at);
alter table public.rfq_messages enable row level security;
revoke all on public.rfq_messages from anon;

drop policy if exists "admins manage messages" on public.rfq_messages;
create policy "admins manage messages"
  on public.rfq_messages for all to authenticated
  using (public.is_admin()) with check (public.is_admin() and sender_role in ('buyer','team'));

drop policy if exists "supplier reads own messages" on public.rfq_messages;
create policy "supplier reads own messages"
  on public.rfq_messages for select to authenticated
  using (public.has_2fa() and rfq_id in (
    select id from public.rfqs where supplier_id in (select public.my_supplier_ids())));

drop policy if exists "supplier sends messages" on public.rfq_messages;
create policy "supplier sends messages"
  on public.rfq_messages for insert to authenticated
  with check (public.has_2fa() and sender_role = 'supplier' and rfq_id in (
    select id from public.rfqs where supplier_id in (select public.my_supplier_ids())));

-- O nome de quem escreve como fornecedor vem do cadastro (não dá para se passar por outro)
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
  end if;
  new.sender_user := auth.uid();
  return new;
end $$;

drop trigger if exists rfq_message_sender on public.rfq_messages;
create trigger rfq_message_sender before insert on public.rfq_messages
  for each row execute function public.rfq_message_sender();

-- Mensagens novas chegam na hora (Supabase Realtime respeita as regras acima)
do $$ begin
  alter publication supabase_realtime add table public.rfq_messages;
exception when duplicate_object then null;
end $$;
