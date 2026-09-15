const test = require('node:test');
const assert = require('node:assert/strict');
const { lerXml, textoXml } = require('../../src/lib/xml.cjs');
const { lerXmlNfse } = require('../../src/lib/xml-nfse.cjs');

const CHAVE = `3550308${'11222333000181'}${'0'.repeat(29)}`;

function xmlNota({ prefixo = '', emit = '<CNPJ>11222333000181</CNPJ>', subst = '' } = {}) {
  const p = prefixo ? `${prefixo}:` : '';
  const ns = prefixo ? `xmlns:${prefixo}` : 'xmlns';
  return `﻿<?xml version="1.0" encoding="UTF-8"?>
<!-- DOCUMENTO FICTÍCIO — SEM VALOR FISCAL -->
<${p}NFSe ${ns}="http://www.sped.fazenda.gov.br/nfse" versao="1.01">
  <${p}infNFSe Id="NFS${CHAVE}">
    <${p}nNFSe>000123</${p}nNFSe>
    <${p}dhProc>2026-09-10T14:32:00-03:00</${p}dhProc>
    <${p}emit>${emit.replaceAll('<', `<${p}`).replaceAll(`<${p}/`, `</${p}`)}<${p}xNome>Ateliê Bromélia &amp; Cia Ltda.</${p}xNome></${p}emit>
    <${p}valores><${p}vTotalRet>150.00</${p}vTotalRet><${p}vLiq>1350.00</${p}vLiq></${p}valores>
    <${p}DPS><${p}infDPS>
      <${p}dCompet>2026-09-01</${p}dCompet>
      <${p}toma><${p}CNPJ>12ABC34501DE35</${p}CNPJ><${p}xNome>Colmeia Espaços Colaborativos Ltda.</${p}xNome></${p}toma>
      <${p}serv><${p}cServ><${p}xDescServ><![CDATA[Design de materiais <gráficos>]]></${p}xDescServ></${p}cServ></${p}serv>
      <${p}valores><${p}vServPrest><${p}vServ>1500.00</${p}vServ></${p}vServPrest></${p}valores>
      ${subst}
    </${p}infDPS></${p}DPS>
  </${p}infNFSe>
  <Signature xmlns="http://www.w3.org/2000/09/xmldsig#"><SignedInfo/></Signature>
</${p}NFSe>`;
}

test('lerXml resolve namespace, atributos, CDATA e entidades', () => {
  const raiz = lerXml(xmlNota());
  assert.equal(raiz.nome, 'NFSe');
  assert.equal(raiz.ns, 'http://www.sped.fazenda.gov.br/nfse');
  assert.equal(textoXml(raiz, 'infNFSe/emit/xNome'), 'Ateliê Bromélia & Cia Ltda.');
  assert.equal(textoXml(raiz, 'infNFSe/DPS/infDPS/serv/cServ/xDescServ'), 'Design de materiais <gráficos>');
  assert.equal(textoXml(raiz, 'infNFSe/naoExiste'), null);
});

test('lerXml rejeita XML malformado', () => {
  assert.throws(() => lerXml('<a><b></a>'), /XML inválido/);
  assert.throws(() => lerXml('texto solto'), /XML inválido/);
});

test('lerXmlNfse lê os campos da seção 4.4.2', () => {
  const resultado = lerXmlNfse(xmlNota());
  assert.equal(resultado.tipo, 'nfse');
  assert.deepEqual(resultado.nota, {
    tipo: 'nfse',
    numero: '000123',
    chave_acesso: CHAVE,
    data_emissao: '2026-09-10',
    competencia: '2026-09-01',
    prestador_documento: '11222333000181',
    prestador_nome: 'Ateliê Bromélia & Cia Ltda.',
    tomador_cnpj: '12ABC34501DE35',
    tomador_nome: 'Colmeia Espaços Colaborativos Ltda.',
    descricao_servico: 'Design de materiais <gráficos>',
    valor_servico: 1500,
    retencoes_total: 150,
    valor_liquido: 1350,
    chave_nota_substituida: null,
    vencimento: null,
    vencimento_trecho: null,
  });
});

test('lerXmlNfse aceita prefixo de namespace, CPF do emitente e nota substituta', () => {
  const resultado = lerXmlNfse(xmlNota({ prefixo: 'nfse', emit: '<CPF>12345678909</CPF>', subst: '<nfse:subst><nfse:chSubstda>NFS123ABC</nfse:chSubstda></nfse:subst>' }));
  assert.equal(resultado.tipo, 'nfse');
  assert.equal(resultado.nota.prestador_documento, '12345678909');
  assert.equal(resultado.nota.chave_nota_substituida, '123ABC');
});

test('lerXmlNfse reconhece evento e XML desconhecido', () => {
  assert.deepEqual(lerXmlNfse('<evento xmlns="http://www.sped.fazenda.gov.br/nfse"><infEvento/></evento>'), { tipo: 'evento' });
  assert.deepEqual(lerXmlNfse('<CompNfse xmlns="http://www.abrasf.org.br/nfse.xsd"/>'), { tipo: 'desconhecido' });
  assert.equal(lerXmlNfse('<<<').tipo, 'desconhecido');
});
