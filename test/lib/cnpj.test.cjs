const test = require('node:test');
const assert = require('node:assert/strict');
const c = require('../../src/lib/cnpj.cjs');

test('vetor oficial da Receita: 12ABC34501DE tem DV 35', () => {
  assert.equal(c.calcularDvCnpj('12ABC34501DE'), '35');
  assert.equal(c.validarCnpj('12ABC34501DE35'), true);
});

test('CNPJ numérico válido e com DV trocado', () => {
  assert.equal(c.validarCnpj('11.222.333/0001-81'), true);
  assert.equal(c.validarCnpj('11.222.333/0001-18'), false);
});

test('entrada com pontuação e minúsculas é normalizada', () => {
  assert.equal(c.validarCnpj('12.abc.345/01de-35'), true);
});

test('sequência repetida e tamanho errado são inválidos', () => {
  assert.equal(c.validarCnpj('00000000000000'), false);
  assert.equal(c.validarCnpj('AAAAAAAAAAAAAA'), false);
  assert.equal(c.validarCnpj('1122233300018'), false);
  assert.equal(c.validarCnpj('12ABC34501DEAB'), false);
});

test('CPF é detectado e mascarado sem expor os dígitos das pontas', () => {
  assert.equal(c.ehCpf('123.456.789-09'), true);
  assert.equal(c.ehCpf('11222333000181'), false);
  assert.equal(c.mascararCpf('123.456.789-09'), '***.456.789-**');
  assert.equal(c.documentoParaGravar('123.456.789-09'), '***.456.789-**');
  assert.equal(c.documentoParaGravar('11.222.333/0001-81'), '11222333000181');
});
