const test = require('node:test');
const assert = require('node:assert/strict');
const { lerXmlsDoPacote, avaliarPdfs } = require('../../src/lib/leitura.cjs');
const { consolidar } = require('../../src/lib/consolidacao.cjs');
const { CHAVE_A, CHAVE_B, xmlNfseSimples, pacoteBase, documentoIa } = require('./fixtures.cjs');

const MODELO = 'gemini-3.5-flash-lite';

function prepararPacote(sobrescrever, conteudos, leiturasPdf = []) {
  const lido = lerXmlsDoPacote(pacoteBase(sobrescrever), (chave) => conteudos[chave]);
  return avaliarPdfs(lido, leiturasPdf);
}

test('T01: XML + DANFSe + boleto -> uma nota lida por XML, vencimento do boleto e 3 arquivos ligados', () => {
  const pacote = prepararPacote(
    { anexos: [{ chave: 'x', tipo: 'xml' }, { chave: 'danfse', tipo: 'pdf' }, { chave: 'boleto', tipo: 'pdf' }] },
    { x: xmlNfseSimples() },
    [{ chave: 'danfse', texto: CHAVE_A, erro: null }, { chave: 'boleto', texto: 'boleto', erro: null }],
  );
  assert.deepEqual(pacote.arquivos_ia, ['boleto']);
  const leituraIa = { documentos: [documentoIa({ tipo: 'boleto', arquivo: 1, valor_documento: 1500, vencimento: '2026-09-25', vencimento_trecho: 'Vencimento 25/09/2026' })], vencimento_corpo_email: { data: null, trecho: null } };
  const { notas, linha_propria } = consolidar(pacote, leituraIa, MODELO);
  assert.equal(linha_propria, null);
  assert.equal(notas.length, 1);
  assert.equal(notas[0].lido_por, 'XML');
  assert.equal(notas[0].vencimento, '2026-09-25');
  assert.equal(notas[0].vencimento_fonte, 'Boleto');
  assert.equal(notas[0].vencimento_trecho, 'Vencimento 25/09/2026');
  assert.deepEqual(notas[0].observacoes, []);
  assert.deepEqual(notas[0].arquivos_ligados, [{ chave: 'x', tipo: 'xml' }, { chave: 'danfse', tipo: 'nota' }, { chave: 'boleto', tipo: 'boleto' }]);
});

test('T12: duas notas e boleto com o valor da segunda', () => {
  const pacote = prepararPacote(
    { anexos: [{ chave: 'x1', tipo: 'xml' }, { chave: 'x2', tipo: 'xml' }, { chave: 'boleto', tipo: 'pdf' }] },
    { x1: xmlNfseSimples({ chave: CHAVE_A, numero: '10', vLiq: '800.00', vServ: '800.00' }), x2: xmlNfseSimples({ chave: CHAVE_B, numero: '11', vLiq: '1200.00', vServ: '1200.00' }) },
    [{ chave: 'boleto', texto: '', erro: null }],
  );
  const leituraIa = { documentos: [documentoIa({ tipo: 'boleto', arquivo: 1, valor_documento: 1200, vencimento: '2026-09-30' })], vencimento_corpo_email: { data: null, trecho: null } };
  const { notas } = consolidar(pacote, leituraIa, MODELO);
  assert.equal(notas[0].vencimento, null);
  assert.deepEqual(notas[0].observacoes, ['SEM_VENCIMENTO']);
  assert.equal(notas[1].vencimento, '2026-09-30');
  assert.equal(notas[1].arquivos_ligados.some((a) => a.chave === 'boleto'), true);
  assert.equal(notas[0].arquivos_ligados.some((a) => a.chave === 'boleto'), false);
});

test('T24: empate de valor -> ninguem recebe vencimento e o boleto vai para a primeira nota', () => {
  const pacote = prepararPacote(
    { anexos: [{ chave: 'x1', tipo: 'xml' }, { chave: 'x2', tipo: 'xml' }, { chave: 'boleto', tipo: 'pdf' }] },
    { x1: xmlNfseSimples({ chave: CHAVE_A, numero: '10' }), x2: xmlNfseSimples({ chave: CHAVE_B, numero: '11' }) },
    [{ chave: 'boleto', texto: '', erro: null }],
  );
  const leituraIa = { documentos: [documentoIa({ tipo: 'boleto', arquivo: 1, valor_documento: 1500, vencimento: '2026-09-30' })], vencimento_corpo_email: { data: null, trecho: null } };
  const { notas } = consolidar(pacote, leituraIa, MODELO);
  assert.deepEqual(notas.map((n) => n.observacoes), [['SEM_VENCIMENTO'], ['SEM_VENCIMENTO']]);
  assert.deepEqual(notas[0].arquivos_ligados.at(-1), { chave: 'boleto', tipo: 'boleto' });
});

test('PDF lido pela IA vira nota; vencimento do corpo; NF-e com chave de 44 digitos vai para linha propria', () => {
  const pacote = prepararPacote(
    { corpo_texto: 'Vence 20/09', anexos: [{ chave: 'p1', tipo: 'pdf' }, { chave: 'danfe', tipo: 'pdf' }] },
    {},
    [{ chave: 'p1', texto: '', erro: null }, { chave: 'danfe', texto: '', erro: null }],
  );
  const leituraIa = {
    documentos: [
      documentoIa({ arquivo: 1, numero: '77', chave_acesso: CHAVE_B, valor_liquido: 900 }),
      documentoIa({ arquivo: 2, numero: '5', chave_acesso: '3526098156209300014855001000045871134587111' + '9' }),
    ],
    vencimento_corpo_email: { data: '2026-09-20', trecho: 'Vence 20/09' },
  };
  const { notas, linha_propria } = consolidar(pacote, leituraIa, MODELO);
  assert.equal(notas.length, 1);
  assert.equal(notas[0].lido_por, `IA (${MODELO})`);
  assert.equal(notas[0].vencimento_fonte, 'Corpo do e-mail');
  assert.equal('valor_documento' in notas[0], false);
  assert.deepEqual(linha_propria, { motivos: ['NFE_PRODUTO'], arquivos_ligados: [{ chave: 'danfe', tipo: 'anexo' }] });
});

test('chave de NFS-e truncada pela leitura de um escaneado não vira NF-e de produto', () => {
  // A chave nacional da NFS-e tem 50 dígitos; um escaneado mal lido pode devolver 44 e
  // cair na regra de NF-e. O modelo (posições 21 e 22) só é 55 ou 65 numa NF-e de verdade.
  const pacote = prepararPacote(
    { corpo_texto: '', anexos: [{ chave: 'p1', tipo: 'pdf' }] },
    {},
    [{ chave: 'p1', texto: '', erro: null }],
  );
  const leituraIa = {
    documentos: [documentoIa({ arquivo: 1, numero: '87', chave_acesso: '35503081292640187000106000000000008726097777'.slice(0, 44), valor_liquido: 1200 })],
  };
  const { notas, linha_propria } = consolidar(pacote, leituraIa, MODELO);
  assert.equal(linha_propria, null);
  assert.equal(notas.length, 1);
  assert.equal(notas[0].numero, '87');
});

test('So boleto -> linha propria NOTA_NAO_ENCONTRADA com todos os arquivos', () => {
  const pacote = prepararPacote({ anexos: [{ chave: 'b', tipo: 'pdf' }] }, {}, [{ chave: 'b', texto: '', erro: null }]);
  const leituraIa = { documentos: [documentoIa({ tipo: 'boleto', arquivo: 1 })], vencimento_corpo_email: { data: null, trecho: null } };
  const { notas, linha_propria } = consolidar(pacote, leituraIa, MODELO);
  assert.equal(notas.length, 0);
  assert.deepEqual(linha_propria, { motivos: ['NOTA_NAO_ENCONTRADA'], arquivos_ligados: [{ chave: 'b', tipo: 'anexo' }] });
});

test('SEM_ANEXO e EMPRESA_DESCONHECIDA acumulam na linha propria sem chamar a IA', () => {
  const pacote = prepararPacote({ empresa: null, motivos_pacote: ['EMPRESA_DESCONHECIDA'], motivos_arquivo: ['SEM_ANEXO'] }, {});
  const { notas, linha_propria } = consolidar(pacote, null, MODELO);
  assert.equal(notas.length, 0);
  assert.deepEqual(linha_propria.motivos, ['EMPRESA_DESCONHECIDA', 'SEM_ANEXO']);
});

test('Vencimento do formulario vale para todas as notas; motivo de arquivo vira observacao quando ha nota', () => {
  const pacote = prepararPacote(
    { origem: 'formulario', vencimento_informado: '2026-10-01', anexos: [{ chave: 'x1', tipo: 'xml' }, { chave: 'senha', tipo: 'pdf' }] },
    { x1: xmlNfseSimples() },
    [{ chave: 'senha', texto: '', erro: 'No password given' }],
  );
  const { notas, linha_propria } = consolidar(pacote, null, MODELO);
  assert.equal(linha_propria, null);
  assert.equal(notas[0].vencimento_fonte, 'Formulário');
  assert.deepEqual(notas[0].observacoes, ['ARQUIVO_ILEGIVEL']);
  assert.deepEqual(notas[0].arquivos_ligados.at(-1), { chave: 'senha', tipo: 'anexo' });
});

test('IA lendo de novo a nota do XML nao gera nota repetida', () => {
  const pacote = prepararPacote(
    { anexos: [{ chave: 'x1', tipo: 'xml' }, { chave: 'scan', tipo: 'pdf' }] },
    { x1: xmlNfseSimples() },
    [{ chave: 'scan', texto: '', erro: null }],
  );
  const leituraIa = { documentos: [documentoIa({ arquivo: 1, chave_acesso: CHAVE_A })], vencimento_corpo_email: { data: null, trecho: null } };
  const { notas } = consolidar(pacote, leituraIa, MODELO);
  assert.equal(notas.length, 1);
  assert.deepEqual(notas[0].arquivos_ligados, [{ chave: 'x1', tipo: 'xml' }, { chave: 'scan', tipo: 'nota' }]);
});
