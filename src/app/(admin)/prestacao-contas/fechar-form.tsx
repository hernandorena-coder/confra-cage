"use client";

import { useState } from "react";
import { fecharPrestacaoContas } from "./actions";

export function FecharForm({ eventoId, temPendencias }: { eventoId: string; temPendencias: boolean }) {
  const [confirmado, setConfirmado] = useState(!temPendencias);

  return (
    <form action={fecharPrestacaoContas} style={{ marginTop: 10 }}>
      <input type="hidden" name="eventoId" value={eventoId} />
      {temPendencias && (
        <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13.5, marginBottom: 10 }}>
          <input
            type="checkbox"
            checked={confirmado}
            onChange={(e) => setConfirmado(e.target.checked)}
          />
          Sei que há comprovantes pendentes e quero fechar assim mesmo
        </label>
      )}
      <button type="submit" className="btn btn-primary" disabled={!confirmado}>
        Fechar prestação de contas
      </button>
    </form>
  );
}
