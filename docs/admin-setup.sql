-- =====================================================================
-- India Brazil – área do administrador (/admin) e resumos de catálogos
-- Rode DEPOIS do supabase-setup.sql.
-- Como usar: Supabase > SQL Editor > New query > cole tudo > Run
-- Pode rodar mais de uma vez sem problema.
-- =====================================================================

-- 1) Lista de administradores
--    Quem está aqui pode ver cadastros, baixar catálogos e ler resumos em /admin.
--    Para adicionar alguém: crie o usuário em Authentication > Users > Add user
--    e depois rode:  insert into public.admins (user_id, email)
--                    select id, email from auth.users where email = 'email@exemplo.com';
create table if not exists public.admins (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  email      text not null,
  created_at timestamptz not null default now()
);
alter table public.admins enable row level security;

drop policy if exists "admins see themselves" on public.admins;
create policy "admins see themselves"
  on public.admins for select to authenticated
  using (user_id = auth.uid());

-- Função usada nas regras abaixo: "o usuário logado é administrador?"
create or replace function public.is_admin()
returns boolean
language sql stable security definer
set search_path = ''
as $$ select exists (select 1 from public.admins where user_id = auth.uid()) $$;

revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

-- 2) Administradores podem ler cadastros e mudar o status
drop policy if exists "admins read suppliers" on public.suppliers;
create policy "admins read suppliers"
  on public.suppliers for select to authenticated
  using (public.is_admin());

drop policy if exists "admins update suppliers" on public.suppliers;
create policy "admins update suppliers"
  on public.suppliers for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- 3) Administradores podem baixar os catálogos
drop policy if exists "admins read catalogues" on storage.objects;
create policy "admins read catalogues"
  on storage.objects for select to authenticated
  using (bucket_id = 'catalogues' and public.is_admin());

-- 4) Resumos padronizados dos catálogos (gerados com IA)
--    Gravados pelo script tools/catalogues.py (secret key, fora do site).
create table if not exists public.catalogue_summaries (
  supplier_id  uuid primary key references public.suppliers (id) on delete cascade,
  reference    text not null unique,
  summary      jsonb not null,
  source_files text[] default '{}',
  generated_by text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
alter table public.catalogue_summaries enable row level security;

drop policy if exists "admins read summaries" on public.catalogue_summaries;
create policy "admins read summaries"
  on public.catalogue_summaries for select to authenticated
  using (public.is_admin());

revoke all on public.catalogue_summaries from anon;
