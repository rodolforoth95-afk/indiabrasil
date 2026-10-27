-- =====================================================================
-- India Brasil – jornada do pedido depois da negociação (comprador ↔ fornecedor, com a equipe acompanhando)
-- Rode DEPOIS de portal-setup.sql, marketplace-setup.sql, buyer-account.sql e chat-languages.sql.
-- Só ACRESCENTA colunas, uma tabela e funções. Pode rodar mais de uma vez.
-- Como usar: Supabase > SQL Editor > New query > cole tudo > Run
--
-- Etapas (rfqs.order_stage), sempre começando com a cotação aceita (status 'negotiating'):
--   (vazio)           negociando; o fornecedor envia a proforma (send_pi)
--   pi_sent           proforma enviada: o comprador aprova (approve_pi) ou pede ajuste (request_changes)
--   pi_changes        comprador pediu ajuste: o fornecedor envia proforma nova
--   awaiting_advance  pedido confirmado (status 'won'): o comprador paga o sinal (advance_paid)
--   advance_sent      comprador informou o sinal: o fornecedor confirma (confirm_advance) ou diz que não chegou
--   in_production     em produção: o fornecedor avisa que ficou pronto, com fotos (goods_ready)
--   ready             mercadoria pronta: o comprador aprova (approve_goods) ou pede correção (request_fix)
--   ready_to_ship     aprovada: o fornecedor embarca e envia documentos (shipped)
--   awaiting_balance  embarcado: o comprador paga o saldo (balance_paid)
--   balance_sent      comprador informou o saldo: o fornecedor confirma e libera os documentos (confirm_balance)
--   in_transit        a caminho: o comprador confirma o recebimento e avalia (received)
--   completed         concluído
--   cancelled         cancelado antes de qualquer pagamento (cancel)
-- Sem sinal (0%) pula as etapas do sinal; sem saldo (100% antecipado) pula as do saldo.
-- A qualquer momento: report_issue (comprador ou fornecedor) avisa a equipe; a equipe usa resolve_issue e set_stage.
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
  adv numeric;
  pre_pay constant text[] := array['pi_sent','pi_changes','awaiting_advance'];
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
  adv := coalesce((od #>> '{pi,advance_pct}')::numeric, 0);

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
    nxt := case when adv > 0 then 'awaiting_advance' else 'in_production' end;
    od := jsonb_set(od, '{confirmed_at}', to_jsonb(now()));

  elsif p_action = 'advance_paid' then
    if who = 'supplier' then raise exception 'not allowed'; end if;
    if st is distinct from 'awaiting_advance' then raise exception 'No advance payment pending'; end if;
    nxt := 'advance_sent';

  elsif p_action = 'confirm_advance' then
    if who = 'buyer' then raise exception 'not allowed'; end if;
    if st is distinct from 'advance_sent' then raise exception 'No advance payment to confirm'; end if;
    if d ? 'ready_by' then od := jsonb_set(od, '{ready_by}', d->'ready_by'); end if;
    nxt := 'in_production';

  elsif p_action = 'payment_not_received' then
    if who = 'buyer' then raise exception 'not allowed'; end if;
    if st = 'advance_sent' then nxt := 'awaiting_advance';
    elsif st = 'balance_sent' then nxt := 'awaiting_balance';
    else raise exception 'No payment to check'; end if;

  elsif p_action = 'goods_ready' then
    if who = 'buyer' then raise exception 'not allowed'; end if;
    if st is distinct from 'in_production' then raise exception 'The order is not in production'; end if;
    nxt := 'ready';

  elsif p_action = 'request_fix' then
    if who = 'supplier' then raise exception 'not allowed'; end if;
    if st is distinct from 'ready' then raise exception 'There are no goods waiting for approval'; end if;
    if coalesce(btrim(p_note), '') = '' then raise exception 'Tell what needs to be fixed'; end if;
    nxt := 'in_production';

  elsif p_action = 'approve_goods' then
    if who = 'supplier' then raise exception 'not allowed'; end if;
    if st is distinct from 'ready' then raise exception 'There are no goods waiting for approval'; end if;
    nxt := 'ready_to_ship';

  elsif p_action = 'shipped' then
    if who = 'buyer' then raise exception 'not allowed'; end if;
    if st is distinct from 'ready_to_ship' then raise exception 'The buyer has not approved the goods yet'; end if;
    od := jsonb_set(od, '{shipping}', d || jsonb_build_object('at', now()));
    nxt := case when adv < 100 then 'awaiting_balance' else 'in_transit' end;

  elsif p_action = 'balance_paid' then
    if who = 'supplier' then raise exception 'not allowed'; end if;
    if st is distinct from 'awaiting_balance' then raise exception 'No balance payment pending'; end if;
    nxt := 'balance_sent';

  elsif p_action = 'confirm_balance' then
    if who = 'buyer' then raise exception 'not allowed'; end if;
    if st is distinct from 'balance_sent' then raise exception 'No balance payment to confirm'; end if;
    nxt := 'in_transit';

  elsif p_action = 'received' then
    if who = 'supplier' then raise exception 'not allowed'; end if;
    if st is distinct from 'in_transit' then raise exception 'The order is not in transit'; end if;
    if d ? 'rating' and coalesce((d->>'rating')::int, 0) not between 1 and 5 then raise exception 'Rating must be 1 to 5'; end if;
    od := jsonb_set(od, '{review}', d || jsonb_build_object('at', now()));
    nxt := 'completed';

  elsif p_action = 'cancel' then
    if not (coalesce(st, '') = '' and r.status = 'negotiating' or st = any(pre_pay)) then
      raise exception 'After a payment, ask the India Brasil team to cancel'; end if;
    if coalesce(btrim(p_note), '') = '' then raise exception 'Tell the reason'; end if;
    nxt := 'cancelled';

  elsif p_action = 'report_issue' then
    if coalesce(btrim(p_note), '') = '' then raise exception 'Describe the problem'; end if;
    nxt := st;
    update public.rfqs set order_issue = true where id = r.id;

  elsif p_action = 'resolve_issue' then
    if who <> 'team' then raise exception 'not allowed'; end if;
    nxt := st;
    update public.rfqs set order_issue = false where id = r.id;

  elsif p_action = 'set_stage' then
    if who <> 'team' then raise exception 'not allowed'; end if;
    nxt := nullif(d->>'stage', '');

  else
    raise exception 'Unknown action';
  end if;

  update public.rfqs set
    order_stage = nxt,
    order_data  = od,
    status = case
      when nxt = 'cancelled' then 'closed'
      when nxt in ('awaiting_advance','advance_sent','in_production','ready','ready_to_ship',
                   'awaiting_balance','balance_sent','in_transit','completed') then 'won'
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
