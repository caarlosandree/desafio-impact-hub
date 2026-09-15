const { decodificarEntidades } = require('./texto.cjs'); // @node-only

const XML_NOME = '[A-Za-z_][\\w.\\-]*(?::[A-Za-z_][\\w.\\-]*)?';
const XML_TAG_ABERTURA = new RegExp(`<(${XML_NOME})((?:\\s+[^\\s=/>]+\\s*=\\s*(?:"[^"]*"|'[^']*'))*)\\s*(/?)>`, 'y');
const XML_TAG_FECHAMENTO = new RegExp(`</(${XML_NOME})\\s*>`, 'y');
const XML_ATRIBUTO = /([^\s=/>]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;

function lerXml(texto) {
  const fonte = String(texto ?? '').replace(/^﻿/, '');
  const pilha = [];
  let raiz = null;
  let posicao = 0;
  const falhar = (motivo) => {
    throw new Error(`XML inválido: ${motivo} (posição ${posicao})`);
  };
  const acrescentarTexto = (trecho) => {
    if (pilha.length) pilha[pilha.length - 1].texto += trecho;
    else if (trecho.trim()) falhar('texto fora do elemento raiz');
  };
  while (posicao < fonte.length) {
    const inicio = fonte.indexOf('<', posicao);
    if (inicio === -1) {
      acrescentarTexto(decodificarEntidades(fonte.slice(posicao)));
      break;
    }
    if (inicio > posicao) acrescentarTexto(decodificarEntidades(fonte.slice(posicao, inicio)));
    posicao = inicio;
    if (fonte.startsWith('<!--', inicio)) {
      const fim = fonte.indexOf('-->', inicio);
      if (fim === -1) falhar('comentário sem fim');
      posicao = fim + 3;
      continue;
    }
    if (fonte.startsWith('<![CDATA[', inicio)) {
      const fim = fonte.indexOf(']]>', inicio);
      if (fim === -1 || !pilha.length) falhar('CDATA inválido');
      pilha[pilha.length - 1].texto += fonte.slice(inicio + 9, fim);
      posicao = fim + 3;
      continue;
    }
    if (fonte.startsWith('<?', inicio)) {
      const fim = fonte.indexOf('?>', inicio);
      if (fim === -1) falhar('instrução sem fim');
      posicao = fim + 2;
      continue;
    }
    if (fonte.startsWith('<!', inicio)) {
      const fim = fonte.indexOf('>', inicio);
      if (fim === -1) falhar('declaração sem fim');
      posicao = fim + 1;
      continue;
    }
    XML_TAG_FECHAMENTO.lastIndex = inicio;
    const fechamento = XML_TAG_FECHAMENTO.exec(fonte);
    if (fechamento) {
      const aberto = pilha.pop();
      if (!aberto || aberto.nomeQualificado !== fechamento[1]) falhar(`fechamento inesperado </${fechamento[1]}>`);
      posicao = XML_TAG_FECHAMENTO.lastIndex;
      continue;
    }
    XML_TAG_ABERTURA.lastIndex = inicio;
    const abertura = XML_TAG_ABERTURA.exec(fonte);
    if (!abertura) falhar('tag malformada');
    const [, nomeQualificado, textoAtributos, autoFechada] = abertura;
    const escopo = { ...(pilha.length ? pilha[pilha.length - 1].escopo : {}) };
    const atributos = {};
    for (const [, nomeAtributo, aspasDuplas, aspasSimples] of textoAtributos.matchAll(XML_ATRIBUTO)) {
      const valor = decodificarEntidades(aspasDuplas ?? aspasSimples ?? '');
      if (nomeAtributo === 'xmlns') escopo[''] = valor;
      else if (nomeAtributo.startsWith('xmlns:')) escopo[nomeAtributo.slice(6)] = valor;
      else atributos[nomeAtributo.includes(':') ? nomeAtributo.split(':')[1] : nomeAtributo] = valor;
    }
    const [prefixo, nome] = nomeQualificado.includes(':') ? nomeQualificado.split(':') : ['', nomeQualificado];
    const elemento = { nomeQualificado, nome, prefixo, ns: escopo[prefixo] ?? null, atributos, filhos: [], texto: '', escopo };
    if (pilha.length) pilha[pilha.length - 1].filhos.push(elemento);
    else if (raiz) falhar('mais de um elemento raiz');
    else raiz = elemento;
    if (!autoFechada) pilha.push(elemento);
    posicao = XML_TAG_ABERTURA.lastIndex;
  }
  if (pilha.length) falhar(`tag <${pilha[pilha.length - 1].nomeQualificado}> sem fechamento`);
  if (!raiz) falhar('sem elemento raiz');
  return raiz;
}

function filhoXml(elemento, nome) {
  return elemento?.filhos.find((filho) => filho.nome === nome) ?? null;
}

function caminhoXml(elemento, caminho) {
  return caminho.split('/').reduce((atual, nome) => filhoXml(atual, nome), elemento);
}

function textoXml(elemento, caminho) {
  const alvo = caminho ? caminhoXml(elemento, caminho) : elemento;
  if (!alvo) return null;
  const texto = alvo.texto.trim();
  return texto === '' ? null : texto;
}

module.exports = { lerXml, filhoXml, caminhoXml, textoXml }; // @node-only
