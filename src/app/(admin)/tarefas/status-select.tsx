"use client";

import { useTransition } from "react";
import { atualizarStatusTarefa } from "./actions";

const OPCOES = [
  { valor: "pendente", rotulo: "Pendente" },
  { valor: "em_andamento", rotulo: "Em andamento" },
  { valor: "concluida", rotulo: "Concluída" },
];

export function StatusSelect({ id, statusAtual }: { id: string; statusAtual: string }) {
  const [, startTransition] = useTransition();

  return (
    <select
      defaultValue={statusAtual}
      onChange={(e) => {
        const formData = new FormData();
        formData.set("id", id);
        formData.set("status", e.target.value);
        startTransition(() => {
          atualizarStatusTarefa(formData);
        });
      }}
      className="btn-sm"
      style={{ borderRadius: 8 }}
    >
      {OPCOES.map((o) => (
        <option key={o.valor} value={o.valor}>
          {o.rotulo}
        </option>
      ))}
    </select>
  );
}
