-- =====================================================================
-- India Brasil – idioma de cada mensagem do chat (para traduzir para quem lê em outro idioma).
-- Só ACRESCENTA uma coluna. Pode rodar mais de uma vez.
-- Como usar: Supabase > SQL Editor > New query > cole tudo > Run
-- =====================================================================
alter table public.rfq_messages add column if not exists lang text;
do $$ begin
  alter table public.rfq_messages add constraint rfq_messages_lang check (lang is null or lang in ('en','hi','pt','es'));
exception when duplicate_object then null;
end $$;
