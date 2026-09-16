const test = require('node:test');
const assert = require('node:assert/strict');
const { consultaDrive, planejarPastas, separarEnvios, MIME_PASTA_DRIVE } = require('../../src/lib/drive.cjs');

const PLANO = { arquivos: [
  { anexo_chave: 'a', pasta: ['Colmeia', '2026-09'], nome: 'abcd1234_1201_xml.xml' },
  { anexo_chave: 'b', pasta: ['Colmeia', '2026-09'], nome: 'abcd1234_1201_nota.pdf' },
  { anexo_chave: 'c', pasta: ['_Revisao', '2026-09'], nome: "msg_o'brien.pdf" },
] };

const ITENS = [
  { id: 'f-col', name: 'Colmeia', mimeType: MIME_PASTA_DRIVE, parents: ['raiz'] },
  { id: 'f-rev', name: '_Revisao', mimeType: MIME_PASTA_DRIVE, parents: ['raiz'] },
  { id: 'f-col-09', name: '2026-09', mimeType: MIME_PASTA_DRIVE, parents: ['f-col'] },
  { id: 'arq-1', name: 'abcd1234_1201_xml.xml', mimeType: 'text/xml', parents: ['f-col-09'] },
  { id: 'arq-velho', name: 'abcd1234_1201_nota.pdf', mimeType: 'application/pdf', parents: ['outra-pasta'] },
];

test('consultaDrive pede pastas e os nomes planejados, com aspas escapadas', () => {
  const consulta = consultaDrive(PLANO.arquivos);
  assert.equal(consulta.startsWith(`trashed = false and (mimeType = '${MIME_PASTA_DRIVE}' or name = 'abcd1234_1201_xml.xml'`), true);
  assert.equal(consulta.includes("name = 'msg_o\\'brien.pdf'"), true);
});

test('planejarPastas acha a pasta do mês existente e agenda a que falta', () => {
  assert.deepEqual(planejarPastas(PLANO, ITENS, 'raiz'), {
    pastas_mes: { 'Colmeia/2026-09': 'f-col-09' },
    pastas_criar: [{ caminho: '_Revisao/2026-09', nome: '2026-09', pai_id: 'f-rev' }],
  });
});

test('planejarPastas falha com mensagem clara quando falta a pasta da empresa', () => {
  assert.throws(() => planejarPastas(PLANO, ITENS.slice(1), 'raiz'), /pasta "Colmeia" não existe/);
});

test('separarEnvios reaproveita arquivo existente na mesma pasta e envia o resto', () => {
  const { enviar, links } = separarEnvios(PLANO, ITENS, { 'Colmeia/2026-09': 'f-col-09', '_Revisao/2026-09': 'nova' });
  assert.deepEqual(links, { a: 'https://drive.google.com/file/d/arq-1/view' });
  assert.deepEqual(enviar.map((e) => [e.anexo_chave, e.pasta_id]), [['b', 'f-col-09'], ['c', 'nova']]);
});
