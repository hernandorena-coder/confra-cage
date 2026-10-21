"use client";

import { useState, useTransition } from "react";
import { atualizarResponsavelTarefa, atualizarPrazoTarefa } from "./actions";

export function EditarResponsavel({ id, valorInicial }: { id: string; valorInicial: string | null }) {
  const [valor, setValor] = useState(valorInicial ?? "");
  const [, startTransition] = useTransition();

  return (
    <input
      type="text"
      value={valor}
      onChange={(e) => setValor(e.target.value)}
      onBlur={() => {
        const formData = new FormData();
        formData.set("id", id);
        formData.set("responsavelTexto", valor);
        startTransition(() => {
          atualizarResponsavelTarefa(formData);
        });
      }}
      placeholder="quem vai fazer"
      style={{ width: "100%", maxWidth: 160, padding: "4px 8px", fontSize: 13 }}
    />
  );
}

export function EditarPrazo({ id, valorInicial }: { id: string; valorInicial: string | null }) {
  const [valor, setValor] = useState(valorInicial ?? "");
  const [, startTransition] = useTransition();

  return (
    <input
      type="date"
      value={valor}
      onChange={(e) => setValor(e.target.value)}
      onBlur={() => {
        const formData = new FormData();
        formData.set("id", id);
        formData.set("prazo", valor);
        startTransition(() => {
          atualizarPrazoTarefa(formData);
        });
      }}
      style={{ padding: "4px 8px", fontSize: 13 }}
    />
  );
}
