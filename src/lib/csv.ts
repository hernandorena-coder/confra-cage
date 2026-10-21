// Gera CSV com separador ';' (padrão BR, abre certo no Excel em pt-BR)
// e BOM UTF-8, para acentos não quebrarem ao abrir no Excel do Windows.

function escaparCampo(valor: unknown): string {
  const texto = valor == null ? "" : String(valor);
  if (/[;"\n]/.test(texto)) {
    return `"${texto.replace(/"/g, '""')}"`;
  }
  return texto;
}

export function gerarCsv(cabecalho: string[], linhas: unknown[][]): string {
  const todasAsLinhas = [cabecalho, ...linhas];
  const corpo = todasAsLinhas.map((linha) => linha.map(escaparCampo).join(";")).join("\r\n");
  return "﻿" + corpo;
}
