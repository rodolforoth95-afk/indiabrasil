-- =====================================================================
-- India Brasil – conta do comprador (/comprador): mensagens não lidas, caixa de entrada
-- e ações do comprador sobre o pedido (aceitar cotação para negociar, encerrar).
-- Rode DEPOIS de marketplace-setup.sql. Só ACRESCENTA; pode rodar mais de uma vez.
-- Como usar: Supabase > SQL Editor > New query > cole tudo > Run
-- =====================================================================

-- 1) Até quando cada usuário leu cada conversa (para saber o que é novo)
create table if not exists public.rfq_reads (
  user_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  rfq_id       uuid not null references public.rfqs (id) on delete cascade,
  last_read_at timestamptz not null default now(),
  primary key (user_id, rfq_id)
);
alter table public.rfq_reads enable row level security;
revoke all on public.rfq_reads from anon;

drop policy if exists "users manage own reads" on public.rfq_reads;
create policy "users manage own reads"
  on public.rfq_reads for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid() and public.can_access_rfq(rfq_id::text));

-- 2) Caixa de entrada do comprador: última mensagem, quantas novidades e quantas cotações por pedido
create or replace function public.buyer_inbox()
returns table (rfq_id uuid, last_at timestamptz, last_role text, last_body text,
               unread bigint, quotes bigint, new_quotes bigint)
language sql stable security definer
set search_path = ''
as $$
  select r.id, lm.created_at, lm.sender_role, left(lm.body, 160),
         (select count(*) from public.rfq_messages m
           where m.rfq_id = r.id and m.sender_role <> 'buyer'
             and m.created_at > coalesce(rd.last_read_at, '-infinity'::timestamptz)),
         (select count(*) from public.rfq_quotes q where q.rfq_id = r.id),
         (select count(*) from public.rfq_quotes q
           where q.rfq_id = r.id and q.created_at > coalesce(rd.last_read_at, '-infinity'::timestamptz))
  from public.rfqs r
  left join public.rfq_reads rd on rd.rfq_id = r.id and rd.user_id = auth.uid()
  left join lateral (select m.created_at, m.sender_role, m.body from public.rfq_messages m
                     where m.rfq_id = r.id order by m.created_at desc limit 1) lm on true
  where r.buyer_id = public.my_buyer_id()
$$;
revoke all on function public.buyer_inbox() from public, anon;
grant execute on function public.buyer_inbox() to authenticated;

-- 3) O comprador aceita uma cotação para negociar, ou encerra o pedido
create or replace function public.buyer_set_rfq_status(p_rfq uuid, p_status text)
returns void
language plpgsql security definer
set search_path = ''
as $$
begin
  if p_status not in ('negotiating', 'closed') then raise exception 'status not allowed'; end if;
  update public.rfqs set status = p_status, updated_at = now()
  where id = p_rfq and buyer_id = public.my_buyer_id() and status in ('open', 'quoted', 'negotiating');
  if not found then raise exception 'Pedido não encontrado ou já encerrado'; end if;
end $$;
revoke all on function public.buyer_set_rfq_status(uuid, text) from public, anon;
grant execute on function public.buyer_set_rfq_status(uuid, text) to authenticated;

-- 4) Cargo de quem compra (aparece só para a equipe)
alter table public.buyers add column if not exists job_title text;
