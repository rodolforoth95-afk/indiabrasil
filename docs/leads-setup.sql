-- =====================================================================
-- India Brasil – leads da página inicial ("See the demand for your product")
-- Guarda quem começou pelo formulário do topo, mesmo que não termine o cadastro completo.
-- Só ACRESCENTA uma tabela nova. Rode depois de admin-setup.sql (usa public.is_admin()).
-- Como usar: Supabase > SQL Editor > New query > cole tudo > Run
-- =====================================================================

create table if not exists public.supplier_leads (
  id           uuid primary key default gen_random_uuid(),
  created_at   timestamptz not null default now(),
  category     text check (length(category) <= 80),
  product      text check (length(product) <= 300),
  mobile       text check (length(mobile) <= 20),
  email        text check (length(email) <= 200),
  utm_source   text check (length(utm_source) <= 100),
  utm_campaign text check (length(utm_campaign) <= 100),
  status       text not null default 'new' check (status in ('new','contacted','registered','discarded'))
);
create index if not exists supplier_leads_created_idx on public.supplier_leads (created_at desc);
alter table public.supplier_leads enable row level security;

-- O site (chave pública) só consegue INSERIR; ninguém de fora lê os leads
drop policy if exists "anyone leaves a lead" on public.supplier_leads;
create policy "anyone leaves a lead"
  on public.supplier_leads for insert to anon, authenticated
  with check (status = 'new' and (mobile is not null or email is not null));

drop policy if exists "admins manage leads" on public.supplier_leads;
create policy "admins manage leads"
  on public.supplier_leads for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

grant insert on public.supplier_leads to anon, authenticated;
