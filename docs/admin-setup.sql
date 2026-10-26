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

-- 5) Fila do botão "Processar com IA" do /admin
--    O admin coloca o catálogo na fila; a tarefa do Claude no Mac (Run now) processa e marca como pronto.
create table if not exists public.catalogue_jobs (
  supplier_id  uuid primary key references public.suppliers (id) on delete cascade,
  reference    text not null,
  status       text not null default 'queued'
               check (status in ('queued','processing','done','error')),
  requested_at timestamptz not null default now(),
  requested_by text,
  started_at   timestamptz,
  finished_at  timestamptz,
  error        text
);
alter table public.catalogue_jobs enable row level security;

drop policy if exists "admins read jobs" on public.catalogue_jobs;
create policy "admins read jobs"
  on public.catalogue_jobs for select to authenticated
  using (public.is_admin());

-- Pelo site o admin só consegue colocar na fila; o andamento é gravado pelo script (secret key)
drop policy if exists "admins queue jobs" on public.catalogue_jobs;
create policy "admins queue jobs"
  on public.catalogue_jobs for insert to authenticated
  with check (public.is_admin() and status = 'queued');

drop policy if exists "admins requeue jobs" on public.catalogue_jobs;
create policy "admins requeue jobs"
  on public.catalogue_jobs for update to authenticated
  using (public.is_admin()) with check (public.is_admin() and status = 'queued');

revoke all on public.catalogue_jobs from anon;
