const test = require('node:test');
const assert = require('node:assert/strict');
const { lerXmlsDoPacote, avaliarPdfs } = require('../../src/lib/leitura.cjs');
const { CHAVE_A, xmlNfseSimples, pacoteBase } = require('./fixtures.cjs');

const conteudos = {
  x1: xmlNfseSimples(),
  x2: '<evento xmlns="http://www.sped.fazenda.gov.br/nfse"><infEvento/></evento>',
  x3: '<CompNfse xmlns="http://www.abrasf.org.br/nfse.xsd"/>',
};
const lerTexto = (chave) => conteudos[chave];

test('lerXmlsDoPacote lê notas, eventos e repete a mesma nota uma vez só', () => {
  const pacote = pacoteBase({ anexos: [
    { chave: 'x1', tipo: 'xml' }, { chave: 'x1copia', tipo: 'xml' }, { chave: 'x2', tipo: 'xml' }, { chave: 'p1', tipo: 'pdf' },
  ] });
  conteudos.x1copia = conteudos.x1;
  const lido = lerXmlsDoPacote(pacote, lerTexto);
  assert.equal(lido.notas_xml.length, 1);
  assert.equal(lido.notas_xml[0].chave_acesso, CHAVE_A);
  assert.equal(lido.notas_xml[0].lido_por, 'XML');
  assert.equal(lido.notas_xml[0].arquivo_chave, 'x1');
  assert.deepEqual(lido.documentos_revisao, [{ codigo: 'EVENTO_NFSE', arquivo_chave: 'x2' }]);
  assert.deepEqual(lido.motivos_arquivo, []);
});

test('lerXmlsDoPacote marca XML_NAO_RECONHECIDO só sem PDF ou imagem', () => {
  const semPdf = lerXmlsDoPacote(pacoteBase({ anexos: [{ chave: 'x3', tipo: 'xml' }] }), lerTexto);
  assert.deepEqual(semPdf.motivos_arquivo, ['XML_NAO_RECONHECIDO']);
  const comPdf = lerXmlsDoPacote(pacoteBase({ anexos: [{ chave: 'x3', tipo: 'xml' }, { chave: 'p1', tipo: 'pdf' }] }), lerTexto);
  assert.deepEqual(comPdf.motivos_arquivo, []);
});

test('avaliarPdfs separa representação da nota, ilegível e arquivos para a IA', () => {
  const pacote = lerXmlsDoPacote(pacoteBase({
    corpo_texto: 'Segue nota',
    anexos: [{ chave: 'x1', tipo: 'xml' }, { chave: 'danfse', tipo: 'pdf' }, { chave: 'boleto', tipo: 'pdf' }, { chave: 'senha', tipo: 'pdf' }, { chave: 'foto', tipo: 'imagem' }],
  }), lerTexto);
  const chaveFormatada = CHAVE_A.replace(/(.{4})/g, '$1 ');
  const avaliado = avaliarPdfs(pacote, [
    { chave: 'danfse', texto: `DANFSe\nChave de acesso: ${chaveFormatada}`, erro: null },
    { chave: 'boleto', texto: 'Vencimento 20/09/2026', erro: null },
    { chave: 'senha', texto: '', erro: 'No password given' },
  ]);
  assert.deepEqual(avaliado.representacoes, { danfse: CHAVE_A });
  assert.deepEqual(avaliado.ilegiveis, ['senha']);
  assert.deepEqual(avaliado.arquivos_ia, ['boleto', 'foto']);
  assert.deepEqual(avaliado.motivos_arquivo, ['ARQUIVO_ILEGIVEL']);
  assert.equal(avaliado.precisa_ia, true);
});

test('avaliarPdfs chama a IA só pelo corpo quando falta vencimento de nota lida por XML', () => {
  const base = lerXmlsDoPacote(pacoteBase({ corpo_texto: 'Vence dia 20', anexos: [{ chave: 'x1', tipo: 'xml' }] }), lerTexto);
  assert.equal(avaliarPdfs(base, []).precisa_ia, true);
  assert.equal(avaliarPdfs({ ...base, vencimento_informado: '2026-09-20' }, []).precisa_ia, false);
  assert.equal(avaliarPdfs({ ...base, corpo_texto: '  ' }, []).precisa_ia, false);
});
