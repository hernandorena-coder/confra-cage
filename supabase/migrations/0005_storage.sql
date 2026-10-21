-- Bucket privado para comprovantes de pagamento e notas fiscais.
-- Convenção de path: 'pagamento/<pagamento_id>/<arquivo>' e 'despesa/<despesa_id>/<arquivo>'.
-- Nunca público; acesso só por signed URL gerada no servidor, e mesmo assim só
-- se a policy abaixo permitir (reaproveita a mesma lógica de permissoes_papel).

insert into storage.buckets (id, name, public)
values ('comprovantes', 'comprovantes', false)
on conflict (id) do nothing;

create policy comprovantes_leitura on storage.objects for select
using (
  bucket_id = 'comprovantes' and (
    (
      split_part(name, '/', 1) = 'pagamento'
      and exists (
        select 1 from pagamentos p
        where p.id = (split_part(name, '/', 2))::uuid
          and tem_permissao(p.evento_id, 'comprovantes_pagamento', false, p.pessoa_id)
      )
    )
    or (
      split_part(name, '/', 1) = 'despesa'
      and exists (
        select 1 from despesas d
        where d.id = (split_part(name, '/', 2))::uuid
          and tem_permissao(d.evento_id, 'comprovantes_despesa', false, null, d.grupo_responsavel)
      )
    )
  )
);

create policy comprovantes_upload on storage.objects for insert
with check (
  bucket_id = 'comprovantes' and (
    (
      split_part(name, '/', 1) = 'pagamento'
      and exists (
        select 1 from pagamentos p
        where p.id = (split_part(name, '/', 2))::uuid
          and tem_permissao(p.evento_id, 'comprovantes_pagamento', true, p.pessoa_id)
      )
    )
    or (
      split_part(name, '/', 1) = 'despesa'
      and exists (
        select 1 from despesas d
        where d.id = (split_part(name, '/', 2))::uuid
          and tem_permissao(d.evento_id, 'comprovantes_despesa', true, null, d.grupo_responsavel)
      )
    )
  )
);

-- Sem policy de update/delete: comprovante enviado não é substituído nem removido
-- por usuário comum (evita perda de evidência); exclusão só via service_role, se necessário.
