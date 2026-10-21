"use client";

import { useState } from "react";
import { adicionarPessoaManual, colarListaPessoas, importarPessoasCsv } from "./actions";

const AREAS_CONHECIDAS = ["DCD GAB", "DCD SECC", "DCI", "DEO", "DIE", "DNC", "DTI", "GAB"];

export function AdicionarPessoas({ eventoId }: { eventoId: string }) {
  const [aba, setAba] = useState<"manual" | "lista" | "csv">("manual");

  return (
    <div className="card" style={{ marginBottom: 20 }}>
      <div className="tabs" role="tablist">
        <button
          type="button"
          className="tab-btn"
          aria-selected={aba === "manual"}
          onClick={() => setAba("manual")}
        >
          Uma pessoa
        </button>
        <button
          type="button"
          className="tab-btn"
          aria-selected={aba === "lista"}
          onClick={() => setAba("lista")}
        >
          Colar lista
        </button>
        <button
          type="button"
          className="tab-btn"
          aria-selected={aba === "csv"}
          onClick={() => setAba("csv")}
        >
          Importar CSV
        </button>
      </div>

      {aba === "manual" && (
        <form action={adicionarPessoaManual} style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
          <input type="hidden" name="eventoId" value={eventoId} />
          <label className="campo" style={{ flex: "1 1 180px" }}>
            Nome
            <input type="text" name="nome" required placeholder="Nome completo" />
          </label>
          <label className="campo" style={{ flex: "1 1 120px" }}>
            Área
            <input type="text" name="area" list="areas-conhecidas" placeholder="ex.: DCI" />
            <datalist id="areas-conhecidas">
              {AREAS_CONHECIDAS.map((a) => (
                <option key={a} value={a} />
              ))}
            </datalist>
          </label>
          <label className="campo" style={{ flex: "1 1 140px" }}>
            Categoria
            <select name="categoria" defaultValue="">
              <option value="">Não sei / depois</option>
              <option value="AUDITOR">Auditor</option>
              <option value="DEMAIS">Demais categorias</option>
              <option value="ISENTO">Isento</option>
            </select>
          </label>
          <button type="submit" className="btn btn-primary">
            Adicionar
          </button>
        </form>
      )}

      {aba === "lista" && (
        <form action={colarListaPessoas}>
          <input type="hidden" name="eventoId" value={eventoId} />
          <p className="muted" style={{ fontSize: 13, marginBottom: 8 }}>
            Cole uma lista, uma pessoa por linha. Pode ser só o nome, ou nome, área e
            categoria separados por vírgula, ponto e vírgula ou traço — o que não vier,
            fica em branco pra completar depois.
          </p>
          <textarea
            name="lista"
            required
            placeholder={"Maria da Silva, DCI, Auditor\nJoão Souza\nAna Pereira - DTI"}
          />
          <button type="submit" className="btn btn-primary" style={{ marginTop: 10 }}>
            Adicionar lista
          </button>
        </form>
      )}

      {aba === "csv" && (
        <form action={importarPessoasCsv} style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <input type="hidden" name="eventoId" value={eventoId} />
          <input type="file" name="arquivo" accept=".csv,text/csv" required />
          <button type="submit" className="btn btn-primary">
            Importar CSV
          </button>
          <span className="muted" style={{ fontSize: 12 }}>
            Formato: nome;area;categoria (AUDITOR/DEMAIS/ISENTO);email
          </span>
        </form>
      )}
    </div>
  );
}
