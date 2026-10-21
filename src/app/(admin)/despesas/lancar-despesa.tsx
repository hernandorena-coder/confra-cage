"use client";

import { lancarDespesa } from "./actions";

interface CategoriaOrcamento {
  id: string;
  nome: string;
}

export function LancarDespesa({
  eventoId,
  categorias,
}: {
  eventoId: string;
  categorias: CategoriaOrcamento[];
}) {
  return (
    <div className="card" style={{ marginBottom: 20 }}>
      <h3 style={{ fontSize: 15, color: "var(--navy)", marginBottom: 12 }}>Lançar despesa</h3>
      <form action={lancarDespesa} style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
        <input type="hidden" name="eventoId" value={eventoId} />

        <label className="campo" style={{ flex: "1 1 220px" }}>
          Item
          <input type="text" name="item" required placeholder="ex.: Carnes para churrasco" />
        </label>

        <label className="campo" style={{ flex: "0 1 120px" }}>
          Valor (R$)
          <input type="number" name="valor" step="0.01" min="0" required />
        </label>

        <label className="campo" style={{ flex: "1 1 180px" }}>
          Categoria
          <select name="categoriaOrcamentoId" defaultValue="">
            <option value="">Selecione</option>
            {categorias.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </select>
        </label>

        <label className="campo" style={{ flex: "1 1 150px" }}>
          Tipo de documento
          <select name="tipoDocumento" defaultValue="">
            <option value="">Selecione</option>
            <option value="DANFE">DANFE</option>
            <option value="NFC-e">NFC-e</option>
            <option value="Cupom fiscal">Cupom fiscal</option>
            <option value="Recibo">Recibo</option>
            <option value="Comprovante PIX">Comprovante PIX</option>
            <option value="não fiscal">Não é nota fiscal</option>
          </select>
        </label>

        <label className="campo" style={{ flex: "0 1 140px" }}>
          Nº do documento
          <input type="text" name="numeroDocumento" />
        </label>

        <label className="campo" style={{ flex: "1 1 160px" }}>
          Quem pagou
          <input type="text" name="pagoPorTexto" placeholder="nome" />
        </label>

        <label className="campo" style={{ flex: "1 1 140px" }}>
          Grupo responsável
          <input type="text" name="grupoResponsavel" placeholder="ex.: Churrasco" />
        </label>

        <label className="campo" style={{ flex: "1 1 160px" }}>
          Status do comprovante
          <select name="statusComprovante" defaultValue="pendente">
            <option value="recebido">Recebido</option>
            <option value="pendente">Pendente</option>
            <option value="fora_do_quadro">Fora do quadro</option>
            <option value="nao_fiscal">Não é nota fiscal</option>
          </select>
        </label>

        <label className="campo" style={{ flex: "1 1 200px" }}>
          Anexar nota (opcional agora)
          <input type="file" name="arquivo" accept="image/*,application/pdf" />
        </label>

        <button type="submit" className="btn btn-primary">
          Lançar
        </button>
      </form>
    </div>
  );
}
