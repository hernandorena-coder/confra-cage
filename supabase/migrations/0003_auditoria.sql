-- Trilha de auditoria por trigger de banco (não por lógica de aplicação),
-- para garantir que nenhuma alteração escape do log, mesmo via chamada direta à API.

create or replace function registrar_auditoria() returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_campo text;
  v_antigo text;
  v_novo text;
  v_evento_id uuid;
begin
  if tg_op = 'UPDATE' then
    v_evento_id := (to_jsonb(new)->>'evento_id')::uuid;
    for v_campo in select key from jsonb_each_text(to_jsonb(new))
    loop
      v_antigo := to_jsonb(old)->>v_campo;
      v_novo := to_jsonb(new)->>v_campo;
      if v_campo not in ('atualizado_em', 'atualizado_por') and v_antigo is distinct from v_novo then
        insert into log_auditoria (evento_id, tabela_afetada, registro_id, acao, campo_alterado, valor_anterior, valor_novo, usuario_id)
        values (v_evento_id, tg_table_name, new.id, 'update', v_campo, v_antigo, v_novo, auth.uid());
      end if;
    end loop;
  elsif tg_op = 'INSERT' then
    v_evento_id := (to_jsonb(new)->>'evento_id')::uuid;
    insert into log_auditoria (evento_id, tabela_afetada, registro_id, acao, usuario_id)
    values (v_evento_id, tg_table_name, new.id, 'insert', auth.uid());
  elsif tg_op = 'DELETE' then
    v_evento_id := (to_jsonb(old)->>'evento_id')::uuid;
    insert into log_auditoria (evento_id, tabela_afetada, registro_id, acao, usuario_id)
    values (v_evento_id, tg_table_name, old.id, 'delete', auth.uid());
  end if;
  return coalesce(new, old);
end;
$$;

create trigger trg_auditoria_pagamentos
  after insert or update or delete on pagamentos
  for each row execute function registrar_auditoria();

create trigger trg_auditoria_pessoas
  after update on pessoas
  for each row execute function registrar_auditoria();

create trigger trg_auditoria_eventos
  after update on eventos
  for each row execute function registrar_auditoria();

create trigger trg_auditoria_patrocinadores
  after insert or update on patrocinadores
  for each row execute function registrar_auditoria();
