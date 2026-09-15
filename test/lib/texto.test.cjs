const test = require('node:test');
const assert = require('node:assert/strict');
const t = require('../../src/lib/texto.cjs');

test('somenteAlfanumericos remove pontuação e deixa maiúsculas', () => {
  assert.equal(t.somenteAlfanumericos(' 12.abc.345/01de-35 '), '12ABC34501DE35');
  assert.equal(t.somenteAlfanumericos(null), '');
});

test('somenteDigitos mantém só números', () => {
  assert.equal(t.somenteDigitos('123.456.789-09'), '12345678909');
});

test('semZerosEsquerda mantém um zero quando só há zeros', () => {
  assert.equal(t.semZerosEsquerda('000123'), '123');
  assert.equal(t.semZerosEsquerda('000'), '0');
});

test('truncar corta no limite e preserva null', () => {
  assert.equal(t.truncar('abcdef', 3), 'abc');
  assert.equal(t.truncar(null, 3), null);
});

test('htmlParaTexto remove tags e decodifica entidades', () => {
  assert.equal(
    t.htmlParaTexto('<p>Vencimento:&nbsp;<b>20/09/2026</b></p><p>R$ 1.500&amp;00</p>'),
    'Vencimento: 20/09/2026\nR$ 1.500&00',
  );
});
