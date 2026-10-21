"use client";

import { useState, useTransition } from "react";
import { atualizarResponsavelPrazo } from "./actions";

export function EditarResponsavelPrazo({
  id,
  responsavelInicial,
  prazoInicial,
}: {
  id: string;
  responsavelInicial: string | null;
  prazoInicial: string | null;
}) {
  const [responsavel, setResponsavel] = useState(responsavelInicial ?? "");
  const [prazo, setPrazo] = useState(prazoInicial ?? "");
  const [, startTransition] = useTransition();

  function salvar() {
    const formData = new FormData();
    formData.set("id", id);
    formData.set("responsavelTexto", responsavel);
    formData.set("prazo", prazo);
    startTransition(() => {
      atualizarResponsavelPrazo(formData);
    });
  }

  return (
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
      <input
        type="text"
        value={responsavel}
        onChange={(e) => setResponsavel(e.target.value)}
        onBlur={salvar}
        placeholder="quem vai fazer"
        style={{ width: 140, padding: "4px 8px", fontSize: 13 }}
      />
      <input
        type="date"
        value={prazo}
        onChange={(e) => setPrazo(e.target.value)}
        onBlur={salvar}
        style={{ padding: "4px 8px", fontSize: 13 }}
      />
    </div>
  );
}
