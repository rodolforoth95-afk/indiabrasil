-- =====================================================================
-- India Brasil – desliga TEMPORARIAMENTE a exigência de 2FA no portal do fornecedor.
-- As regras do banco continuam iguais (o fornecedor só vê o próprio cadastro, pedidos e conversas),
-- só deixam de exigir o código do app autenticador.
-- Para religar o 2FA: rode de novo a função has_2fa() do docs/portal-setup.sql
-- e coloque REQUIRE_2FA=true no portal.html.
-- Como usar: Supabase > SQL Editor > New query > cole tudo > Run
-- =====================================================================
create or replace function public.has_2fa()
returns boolean
language sql stable
set search_path = ''
as $$ select true $$;
