const { somenteAlfanumericos, semZerosEsquerda } = require('./texto.cjs'); // @node-only
const { ehCpf } = require('./cnpj.cjs'); // @node-only
const { linhasValidas } = require('./linhas.cjs'); // @node-only

function chaveDocumentoNumero(documento, numero, sha256) {
  const doc = somenteAlfanumericos(documento);
  const num = semZerosEsquerda(somenteAlfanumericos(numero));
  if (!doc || !num) return null;
  return `${ehCpf(doc) ? `CPF-${sha256(doc).slice(0, 12)}` : doc}|${num}`;
}

function chaveDuplicidade(nota, origemId, indice, sha256) {
  if (nota.chave_acesso) return somenteAlfanumericos(nota.chave_acesso).replace(/^NFS/, '');
  return chaveDocumentoNumero(nota.prestador_documento, nota.numero, sha256) ?? `origem:${origemId}:${indice}`;
}

function idDaChave(chave, sha256) {
  return sha256(chave).slice(0, 8);
}

function decidirDuplicidade(nota, chave, origemId, linhasNotas, sha256) {
  const documentoNumero = chaveDocumentoNumero(nota.prestador_documento, nota.numero, sha256);
  const existente = linhasValidas(linhasNotas).find((linha) => {
    if (String(linha.chave_duplicidade) === chave) return true;
    return documentoNumero !== null && chaveDocumentoNumero(linha.prestador_documento, linha.numero, sha256) === documentoNumero;
  }) ?? null;
  if (!existente) return { acao: 'nova', existente: null };
  return { acao: String(existente.origem_id) === origemId ? 'retomada' : 'duplicata', existente };
}

module.exports = { chaveDuplicidade, idDaChave, decidirDuplicidade }; // @node-only
