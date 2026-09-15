const test = require('node:test');
const assert = require('node:assert/strict');
const d = require('../../src/lib/datas.cjs');
const { linhasValidas } = require('../../src/lib/linhas.cjs');

test('normalizarData aceita ISO, ISO com hora e dd/mm/aaaa', () => {
  assert.equal(d.normalizarData('2026-09-15'), '2026-09-15');
  assert.equal(d.normalizarData('2026-09-15T10:00:00-03:00'), '2026-09-15');
  assert.equal(d.normalizarData('15/09/2026'), '2026-09-15');
});

test('normalizarData rejeita datas impossíveis e textos', () => {
  assert.equal(d.normalizarData('31/02/2026'), null);
  assert.equal(d.normalizarData('amanhã'), null);
  assert.equal(d.normalizarData(null), null);
});

test('dataSaoPaulo e dataHoraSaoPaulo convertem do UTC', () => {
  assert.equal(d.dataSaoPaulo('2026-09-16T02:30:00Z'), '2026-09-15');
  assert.equal(d.dataHoraSaoPaulo('2026-09-15T17:05:00Z'), '2026-09-15 14:05');
});

test('diasEntre e mesDe', () => {
  assert.equal(d.diasEntre('2026-09-01', '2026-09-15'), 14);
  assert.equal(d.diasEntre('2026-09-15', '2026-09-01'), -14);
  assert.equal(d.mesDe('2026-09-15 14:05'), '2026-09');
});

test('linhasValidas descarta itens vazios e de erro', () => {
  assert.deepEqual(linhasValidas([{}, { error: 'x' }, { id: 'a' }, null]), [{ id: 'a' }]);
  assert.deepEqual(linhasValidas(undefined), []);
});
