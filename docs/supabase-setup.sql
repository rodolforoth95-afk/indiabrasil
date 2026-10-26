-- =====================================================================
-- India Brazil – banco de dados de fornecedores (Supabase / PostgreSQL)
-- Como usar: Supabase > SQL Editor > New query > cole tudo > Run
-- =====================================================================

-- 1) Tabela de fornecedores
create table if not exists public.suppliers (
  id                  uuid primary key default gen_random_uuid(),
  reference           text not null unique,              -- ex.: IB-7K3QPA (mostrado ao fornecedor)
  created_at          timestamptz not null default now(),
  status              text not null default 'new'
                      check (status in ('new','in_review','verified','published','rejected')),

  -- Empresa
  company_name        text not null,
  business_type       text,
  website             text,
  city                text,
  state               text,
  iec                 text not null,
  gstin               text,
  year_established    integer,

  -- Contato
  contact_salutation  text,
  contact_name        text not null,
  designation         text,
  email               text not null,
  mobile              text not null,                     -- formato +91XXXXXXXXXX
  whatsapp            boolean default true,

  -- Produtos
  categories          text[] default '{}',
  main_products       text,
  certifications      text[] default '{}',
  export_turnover     text,
  latam_experience    text,

  -- Catálogo
  catalogue_files     text[] default '{}',               -- caminhos no bucket "catalogues"
  catalogue_link      text,

  -- Consentimento e origem
  consent             boolean not null,
  consent_text        text,
  utm_source          text,
  utm_medium          text,
  utm_campaign        text,
  user_agent          text,

  -- Uso interno do time India Brazil
  internal_notes      text,

  constraint iec_format   check (iec ~ '^[A-Z0-9]{10}$'),
  constraint mobile_format check (mobile ~ '^\+91[6-9][0-9]{9}$'),
  constraint consent_given check (consent = true)
);

create index if not exists suppliers_created_at_idx on public.suppliers (created_at desc);
create index if not exists suppliers_iec_idx        on public.suppliers (iec);
create index if not exists suppliers_email_idx      on public.suppliers (lower(email));
create index if not exists suppliers_status_idx     on public.suppliers (status);

-- 2) Segurança: o site (chave pública "anon") só pode INSERIR.
--    Ninguém de fora consegue ler, alterar ou apagar cadastros.
alter table public.suppliers enable row level security;

drop policy if exists "public can register" on public.suppliers;
create policy "public can register"
  on public.suppliers
  for insert
  to anon
  with check (consent = true and status = 'new' and internal_notes is null);

-- 3) Armazenamento dos catálogos (privado)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'catalogues', 'catalogues', false, 26214400,   -- 25 MB por arquivo
  array[
    'application/pdf',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'image/jpeg','image/png'
  ]
)
on conflict (id) do nothing;

drop policy if exists "public can upload catalogues" on storage.objects;
create policy "public can upload catalogues"
  on storage.objects
  for insert
  to anon
  with check (bucket_id = 'catalogues');

-- 4) Visão de trabalho para o time (use no painel do Supabase)
create or replace view public.suppliers_pipeline as
select reference, created_at, status, company_name, state, contact_name, designation,
       email, mobile, whatsapp, categories, iec, gstin, export_turnover,
       array_length(catalogue_files, 1) as files_uploaded, catalogue_link, utm_campaign
from public.suppliers
order by created_at desc;

revoke all on public.suppliers_pipeline from anon;
