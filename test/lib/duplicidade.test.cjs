const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { chaveDuplicidade, idDaChave, decidirDuplicidade } = require('../../src/lib/duplicidade.cjs');

const sha256 = (texto) => crypto.createHash('sha256').update(texto).digest('hex');

test('chaveDuplicidade prefere a chave de acesso sem prefixo', () => {
  assert.equal(chaveDuplicidade({ chave_acesso: 'NFS123ABC' }, 'm1', 0, sha256), '123ABC');
});

test('chaveDuplicidade sem chave usa documento e número sem zeros à esquerda', () => {
  assert.equal(chaveDuplicidade({ prestador_documento: '11.222.333/0001-81', numero: '000123' }, 'm1', 0, sha256), '11222333000181|123');
});

test('chaveDuplicidade nunca expõe CPF', () => {
  const chave = chaveDuplicidade({ prestador_documento: '123.456.789-09', numero: '5' }, 'm1', 0, sha256);
  assert.equal(chave, `CPF-${sha256('12345678909').slice(0, 12)}|5`);
  assert.equal(chave.includes('12345678909'), false);
});

test('chaveDuplicidade sem dados usa a origem e o índice', () => {
  assert.equal(chaveDuplicidade({}, 'm1', 2, sha256), 'origem:m1:2');
});

test('idDaChave tem 8 caracteres determinísticos', () => {
  assert.equal(idDaChave('123ABC', sha256), sha256('123ABC').slice(0, 8));
  assert.match(idDaChave('123ABC', sha256), /^[0-9a-f]{8}$/);
});

test('decidirDuplicidade: nova, retomada e duplicata por documento + número', () => {
  const nota = { chave_acesso: 'CHAVE1', prestador_documento: '11222333000181', numero: '0042' };
  assert.equal(decidirDuplicidade(nota, 'CHAVE1', 'm1', [{}], sha256).acao, 'nova');
  const linhaMesmaOrigem = { id: 'aaaa1111', chave_duplicidade: 'CHAVE1', origem_id: 'm1' };
  assert.equal(decidirDuplicidade(nota, 'CHAVE1', 'm1', [linhaMesmaOrigem], sha256).acao, 'retomada');
  const linhaOutraOrigem = { id: 'bbbb2222', chave_duplicidade: '11222333000181|42', origem_id: 'm0', prestador_documento: '11222333000181', numero: '42' };
  const decisao = decidirDuplicidade(nota, 'CHAVE1', 'm1', [linhaOutraOrigem], sha256);
  assert.equal(decisao.acao, 'duplicata');
  assert.equal(decisao.existente.id, 'bbbb2222');
});

test('mesmo número de outro fornecedor não colide', () => {
  const nota = { chave_acesso: null, prestador_documento: '12ABC34501DE35', numero: '42' };
  const linha = { id: 'bbbb2222', chave_duplicidade: '11222333000181|42', origem_id: 'm0', prestador_documento: '11222333000181', numero: '42' };
  assert.equal(decidirDuplicidade(nota, '12ABC34501DE35|42', 'm1', [linha], sha256).acao, 'nova');
});
