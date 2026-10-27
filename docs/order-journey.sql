-- =====================================================================
-- India Brasil – jornada do pedido depois da negociação (comprador ↔ fornecedor, com a equipe acompanhando)
-- Rode DEPOIS de portal-setup.sql, marketplace-setup.sql, buyer-account.sql e chat-languages.sql.
-- Só ACRESCENTA colunas, uma tabela e funções. Pode rodar mais de uma vez.
-- Como usar: Supabase > SQL Editor > New query > cole tudo > Run
--
-- Etapas (rfqs.order_stage), sempre começando com a cotação aceita (status 'negotiating'):
--   (vazio)     negociando; o fornecedor envia a proforma (send_pi)
--   pi_sent     proforma enviada: o comprador aprova (approve_pi) ou pede ajuste (request_changes)
--   pi_changes  comprador pediu ajuste: o fornecedor envia proforma nova
--   completed   pedido confirmado (status 'won'). Daqui em diante pagamento, produção e embarque seguem só pelo chat.
--   cancelled   cancelado antes da confirmação (cancel)
-- A qualquer momento antes da confirmação: report_issue avisa a equipe; a equipe usa resolve_issue e set_stage.
-- Cada passo grava uma mensagem no chat do pedido (com o anexo, se houver) e um registro em rfq_order_events.
-- =====================================================================

-- 1) Situação do pedido
alter table public.rfqs add column if not exists order_stage text;
alter table public.rfqs add column if not exists order_issue boolean not null default false;
alter table public.rfqs add column if not exists order_data jsonb not null default '{}'::jsonb;
do $$ begin
  alter table public.rfqs add constraint rfqs_order_stage_check check (order_stage is null or order_stage in (
    'pi_sent','pi_changes','awaiting_advance','advance_sent','in_production','ready','ready_to_ship',
    'awaiting_balance','balance_sent','in_transit','completed','cancelled'));
exception when duplicate_object then null;
end $$;

-- 2) Histórico de cada passo (quem fez, quando, documentos)
create table if not exists public.rfq_order_events (
  id              uuid primary key default gen_random_uuid(),
  created_at      timestamptz not null default now(),
  rfq_id          uuid not null references public.rfqs (id) on delete cascade,
  action          text not null,
  stage_from      text,
  stage_to        text,
  actor_role      text not null check (actor_role in ('supplier','buyer','team')),
  actor_user      uuid default auth.uid(),
  note            text check (note is null or length(note) <= 2000),
  data            jsonb not null default '{}'::jsonb,
  attachment_path text check (attachment_path is null or attachment_path like rfq_id::text || '/%'),
  attachment_name text,
  attachment_size bigint
);
create index if not exists rfq_order_events_rfq_idx on public.rfq_order_events (rfq_id, created_at);
alter table public.rfq_order_events enable row level security;
revoke all on public.rfq_order_events from anon;

-- Quem participa do pedido lê o histórico; ninguém grava direto (só pela função abaixo)
drop policy if exists "participants read order events" on public.rfq_order_events;
create policy "participants read order events"
  on public.rfq_order_events for select to authenticated
  using (public.can_access_rfq(rfq_id::text));

-- 3) Um passo da jornada. Confere quem é a pessoa, se é a vez dela e se a etapa permite.
create or replace function public.order_action(
  p_rfq uuid, p_action text, p_message text default null, p_note text default null,
  p_data jsonb default '{}'::jsonb,
  p_attachment_path text default null, p_attachment_name text default null, p_attachment_size bigint default null)
returns jsonb
language plpgsql security definer
set search_path = ''
as $$
declare
  r public.rfqs;
  who text;
  st text;
  nxt text;
  d jsonb := coalesce(p_data, '{}'::jsonb);
  od jsonb;
  pre_pay constant text[] := array['pi_sent','pi_changes'];
begin
  select * into r from public.rfqs where id = p_rfq for update;
  if not found then raise exception 'Order not found'; end if;

  -- Papel de quem clicou (fornecedor, comprador dono do pedido ou equipe)
  if public.has_2fa() and r.supplier_id in (select public.my_supplier_ids()) then who := 'supplier';
  elsif r.buyer_id is not null and r.buyer_id = public.my_buyer_id() then who := 'buyer';
  elsif public.is_admin() then who := 'team';
  else raise exception 'not allowed';
  end if;

  st := r.order_stage;
  od := r.order_data;

  if p_attachment_path is not null and p_attachment_path not like r.id::text || '/%' then
    raise exception 'Invalid attachment';
  end if;

  -- Regras: ação → (quem pode, de qual etapa, para qual etapa)
  if p_action = 'send_pi' then
    if who = 'buyer' then raise exception 'Only the supplier sends the proforma invoice'; end if;
    if r.status <> 'negotiating' or coalesce(st, '') not in ('', 'pi_sent', 'pi_changes') then
      raise exception 'The proforma can be sent after the buyer accepts a quotation'; end if;
    if coalesce((d->>'total')::numeric, 0) <= 0 then raise exception 'Inform the order total'; end if;
    if coalesce((d->>'advance_pct')::numeric, -1) not between 0 and 100 then raise exception 'Advance must be between 0 and 100%%'; end if;
    od := jsonb_set(od, '{pi}', d || jsonb_build_object('at', now()));
    nxt := 'pi_sent';

  elsif p_action = 'request_changes' then
    if who = 'supplier' then raise exception 'not allowed'; end if;
    if st is distinct from 'pi_sent' then raise exception 'There is no proforma waiting for approval'; end if;
    if coalesce(btrim(p_note), '') = '' then raise exception 'Tell what needs to change'; end if;
    nxt := 'pi_changes';

  elsif p_action = 'approve_pi' then
    if who = 'supplier' then raise exception 'not allowed'; end if;
    if st is distinct from 'pi_sent' then raise exception 'There is no proforma waiting for approval'; end if;
    nxt := 'completed';
    od := jsonb_set(od, '{confirmed_at}', to_jsonb(now()));

  elsif p_action = 'cancel' then
    if not (coalesce(st, '') = '' and r.status = 'negotiating' or st = any(pre_pay)) then
      raise exception 'A confirmed order can only be cancelled by the India Brasil team'; end if;
    if coalesce(btrim(p_note), '') = '' then raise exception 'Tell the reason'; end if;
    nxt := 'cancelled';

  elsif p_action = 'report_issue' then
    if coalesce(btrim(p_note), '') = '' then raise exception 'Describe the problem'; end if;
    if st in ('completed', 'cancelled') then raise exception 'Use the chat for this order'; end if;
    nxt := st;
    update public.rfqs set order_issue = true where id = r.id;

  elsif p_action = 'resolve_issue' then
    if who <> 'team' then raise exception 'not allowed'; end if;
    nxt := st;
    update public.rfqs set order_issue = false where id = r.id;

  elsif p_action = 'set_stage' then
    if who <> 'team' then raise exception 'not allowed'; end if;
    nxt := nullif(d->>'stage', '');
    if nxt is not null and nxt not in ('pi_sent','pi_changes','completed','cancelled') then raise exception 'Invalid stage'; end if;

  else
    raise exception 'Unknown action';
  end if;

  update public.rfqs set
    order_stage = nxt,
    order_data  = od,
    status = case
      when nxt = 'cancelled' then 'closed'
      when nxt = 'completed' then 'won'
      when p_action = 'set_stage' and (nxt is null or nxt in ('pi_sent','pi_changes')) then 'negotiating'
      else status end,
    updated_at = now()
  where id = r.id;

  insert into public.rfq_order_events (rfq_id, action, stage_from, stage_to, actor_role, note, data,
                                       attachment_path, attachment_name, attachment_size)
  values (r.id, p_action, st, nxt, who, nullif(btrim(p_note), ''), d,
          p_attachment_path, p_attachment_name, p_attachment_size);

  -- Aviso no chat (é por ele que o outro lado vê na hora e recebe a tradução)
  insert into public.rfq_messages (rfq_id, sender_role, sender_name, body, lang,
                                   attachment_path, attachment_name, attachment_size)
  values (r.id, who,
          case who when 'buyer' then r.buyer_label when 'team' then 'India Brasil team' end,
          left(coalesce(nullif(btrim(p_message), ''), 'Order update: ' || p_action), 4000),
          case who when 'supplier' then 'en' else 'pt' end,
          p_attachment_path, p_attachment_name, p_attachment_size);

  return jsonb_build_object('stage', nxt);
end $$;
revoke all on function public.order_action(uuid, text, text, text, jsonb, text, text, bigint) from public, anon;
grant execute on function public.order_action(uuid, text, text, text, jsonb, text, text, bigint) to authenticated;
