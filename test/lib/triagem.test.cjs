const test = require('node:test');
const assert = require('node:assert/strict');
const { tipoDoAnexo, triarAnexos, decidirPorHashes } = require('../../src/lib/triagem.cjs');

const CONFIG = { imagem_min_kb: 30 };
const anexo = (chave, nome, base64, tamanho, hash) => ({ chave, nome, mime: '', tamanho_bytes: tamanho, hash, base64 });

test('tipoDoAnexo usa a extensão e, sem ela, a assinatura do arquivo', () => {
  assert.equal(tipoDoAnexo(anexo('a', 'Nota.XML', 'PD94', 1)), 'xml');
  assert.equal(tipoDoAnexo(anexo('a', 'nota.pdf', 'JVBERi0', 1)), 'pdf');
  assert.equal(tipoDoAnexo(anexo('a', 'foto.JPG', '/9j/', 1)), 'imagem');
  assert.equal(tipoDoAnexo(anexo('a', 'arquivo', 'JVBERi0xLjQ', 1)), 'pdf');
  assert.equal(tipoDoAnexo(anexo('a', 'notas.zip', 'UEsDBBQ', 1)), null);
  assert.equal(tipoDoAnexo({ chave: 'a', nome: 'sem-extensao', mime: 'application/xml', base64: 'PD94' }), 'xml');
});

test('triarAnexos ignora logo pequeno, marca formato não aceito e mantém o resto', () => {
  const pacote = { origem: 'email', anexos: [
    anexo('attachment_0', 'nota.pdf', 'JVBERi0', 50000, 'h1'),
    anexo('attachment_1', 'logo.png', 'iVBORw0KGgo', 8000, 'h2'),
    anexo('attachment_2', 'notas.zip', 'UEsDBBQ', 9000, 'h3'),
  ] };
  const triado = triarAnexos(pacote, CONFIG);
  assert.deepEqual(triado.anexos.map((a) => [a.chave, a.tipo]), [['attachment_0', 'pdf'], ['attachment_2', 'outro']]);
  assert.deepEqual(triado.ignorados, ['attachment_1']);
  assert.deepEqual(triado.motivos_arquivo, ['ARQUIVO_NAO_SUPORTADO']);
});

test('triarAnexos marca SEM_ANEXO quando não sobra nada', () => {
  assert.deepEqual(triarAnexos({ anexos: [] }, CONFIG).motivos_arquivo, ['SEM_ANEXO']);
  assert.deepEqual(triarAnexos({ anexos: [anexo('a', 'logo.png', 'iVBORw0KGgo', 8000, 'h')] }, CONFIG).motivos_arquivo, ['SEM_ANEXO']);
});

test('decidirPorHashes segue para leitura quando nada foi registrado', () => {
  const pacote = { origem: 'email', origem_id: 'm2', anexos: [{ chave: 'a', hash: 'h1' }] };
  assert.equal(decidirPorHashes(pacote, [{}], [{}]).acao, 'ler');
});

test('decidirPorHashes acusa duplicata quando todos os arquivos vieram de outra origem', () => {
  const pacote = { origem: 'email', origem_id: 'm2', anexos: [{ chave: 'a', hash: 'h1' }, { chave: 'b', hash: 'h2' }] };
  const arquivos = [{ hash_sha256: 'h1', nota_id: 'abcd1234', origem_id: 'm1' }, { hash_sha256: 'h2', nota_id: 'abcd1234', origem_id: 'm1' }];
  const notas = [{ id: 'abcd1234', numero: '1201', origem_id: 'm1', status: 'Extraída' }];
  const decisao = decidirPorHashes(pacote, arquivos, notas);
  assert.equal(decisao.acao, 'duplicata_arquivo');
  assert.equal(decisao.nota_id_existente, 'abcd1234');
  assert.equal(decisao.numero_existente, '1201');
});

test('decidirPorHashes reconhece retomada e calcula a etiqueta que faltou', () => {
  const pacote = { origem: 'email', origem_id: 'm1', anexos: [{ chave: 'a', hash: 'h1' }] };
  const arquivos = [{ hash_sha256: 'h1', nota_id: 'abcd1234', origem_id: 'm1' }];
  const notas = [{ id: 'abcd1234', numero: '1201', origem_id: 'm1', status: 'Revisão', motivos: '[CNPJ_INVALIDO] CNPJ do prestador inválido.' }];
  const decisao = decidirPorHashes(pacote, arquivos, notas);
  assert.equal(decisao.acao, 'retomada_total');
  assert.equal(decisao.etiqueta, 'NF/revisao');
  assert.deepEqual(decisao.notas_existentes, [{ id: 'abcd1234', numero: '1201', status: 'Revisão', motivos: '[CNPJ_INVALIDO] CNPJ do prestador inválido.' }]);
  assert.equal(decidirPorHashes({ ...pacote, origem: 'formulario' }, arquivos, notas).etiqueta, null);
});

test('decidirPorHashes descarta só os arquivos já registrados por outra origem', () => {
  const pacote = { origem: 'email', origem_id: 'm2', anexos: [{ chave: 'a', hash: 'h1' }, { chave: 'b', hash: 'novo' }] };
  const decisao = decidirPorHashes(pacote, [{ hash_sha256: 'h1', nota_id: 'x', origem_id: 'm1' }], []);
  assert.equal(decisao.acao, 'ler');
  assert.deepEqual(decisao.anexos.map((a) => a.chave), ['b']);
});
