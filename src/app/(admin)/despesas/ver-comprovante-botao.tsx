"use client";

import { useState } from "react";
import { gerarUrlComprovanteDespesa } from "./actions";

export function VerComprovanteBotao({ storagePath }: { storagePath: string }) {
  const [carregando, setCarregando] = useState(false);

  async function abrir() {
    setCarregando(true);
    const url = await gerarUrlComprovanteDespesa(storagePath);
    setCarregando(false);
    if (url) window.open(url, "_blank", "noopener,noreferrer");
  }

  return (
    <button
      type="button"
      onClick={abrir}
      disabled={carregando}
      style={{
        border: "none",
        background: "none",
        color: "var(--teal)",
        fontSize: 13,
        cursor: "pointer",
        textDecoration: "underline",
        padding: 0,
      }}
    >
      {carregando ? "abrindo…" : "ver"}
    </button>
  );
}
