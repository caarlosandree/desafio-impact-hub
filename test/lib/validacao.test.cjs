const test = require('node:test');
const assert = require('node:assert/strict');
const { validarNota, formatarMotivos, formatarObservacoes, juntarObservacao, criarMotivo } = require('../../src/lib/validacao.cjs');

const CONTEXTO = {
  empresa: { apelido: 'Colmeia', nome: 'Colmeia Espaços Colaborativos Ltda.', cnpj: '12ABC34501DE35' },
  motivosPacote: [],
  hoje: '2026-09-15',
  config: { emissao_max_dias: 180, vencimento_max_dias: 120 },
  linhasNotas: [],
};

const notaValida = (sobrescrever = {}) => ({
  tipo: 'nfse', numero: '1201', chave_acesso: null, data_emissao: '2026-09-10', competencia: '2026-09-01',
  prestador_documento: '11222333000181', prestador_nome: 'Ateliê Bromélia Design Ltda.',
  tomador_cnpj: '12ABC34501DE35', tomador_nome: 'Colmeia Espaços Colaborativos Ltda.', descricao_servico: 'Design',
  valor_servico: 1500, retencoes_total: 0, valor_liquido: 1500, chave_nota_substituida: null, vencimento: '2026-09-25', vencimento_trecho: null,
  ...sobrescrever,
});
const codigos = (motivos) => motivos.map((motivo) => motivo.codigo);

test('nota correta não gera motivo', () => {
  assert.deepEqual(validarNota(notaValida(), CONTEXTO), []);
});

test('CAMPO_FALTANDO lista os campos em português', () => {
  const motivos = validarNota(notaValida({ numero: null, tomador_cnpj: null, valor_servico: null, valor_liquido: null }), CONTEXTO);
  assert.deepEqual(motivos, [{ codigo: 'CAMPO_FALTANDO', texto: 'Não foi possível ler: número, CNPJ do tomador, valor.' }]);
});

test('prestador com CPF gera só PRESTADOR_PESSOA_FISICA', () => {
  assert.deepEqual(codigos(validarNota(notaValida({ prestador_documento: '12345678909' }), CONTEXTO)), ['PRESTADOR_PESSOA_FISICA']);
});

test('CNPJ inválido do prestador e do tomador; tomador inválido não gera TOMADOR_DIVERGENTE', () => {
  const motivos = validarNota(notaValida({ prestador_documento: '11222333000118', tomador_cnpj: '12ABC34501DE53' }), CONTEXTO);
  assert.deepEqual(motivos.map((m) => m.texto), ['CNPJ do prestador inválido.', 'CNPJ do tomador inválido.']);
});

test('TOMADOR_DIVERGENTE com nomes do tomador e da empresa', () => {
  const motivos = validarNota(notaValida({ tomador_cnpj: '11222333000181', tomador_nome: 'Trampolim Inclusão Produtiva Ltda.' }), CONTEXTO);
  assert.deepEqual(motivos, [{ codigo: 'TOMADOR_DIVERGENTE', texto: 'Nota emitida para Trampolim Inclusão Produtiva Ltda., não para a Colmeia Espaços Colaborativos Ltda.' }]);
});

test('EMPRESA_DESCONHECIDA entra na nota e desliga a regra de tomador', () => {
  const contexto = { ...CONTEXTO, empresa: null, motivosPacote: ['EMPRESA_DESCONHECIDA'] };
  assert.deepEqual(codigos(validarNota(notaValida({ tomador_cnpj: '11222333000181' }), contexto)), ['EMPRESA_DESCONHECIDA']);
});

test('VALOR_INCOERENTE para zero, negativo ou líquido maior que bruto', () => {
  assert.deepEqual(codigos(validarNota(notaValida({ valor_liquido: 0 }), CONTEXTO)), ['VALOR_INCOERENTE']);
  assert.deepEqual(codigos(validarNota(notaValida({ valor_liquido: 1600 }), CONTEXTO)), ['VALOR_INCOERENTE']);
  assert.deepEqual(codigos(validarNota(notaValida({ valor_servico: null, valor_liquido: 10 }), CONTEXTO)), []);
});

test('DATA_INCOERENTE para emissão futura ou além do limite', () => {
  assert.deepEqual(codigos(validarNota(notaValida({ data_emissao: '2026-09-16', vencimento: null }), CONTEXTO)), ['DATA_INCOERENTE']);
  assert.deepEqual(codigos(validarNota(notaValida({ data_emissao: '2026-03-01', vencimento: null }), CONTEXTO)), ['DATA_INCOERENTE']);
  assert.deepEqual(codigos(validarNota(notaValida({ data_emissao: '2026-03-19', vencimento: null }), CONTEXTO)), []);
});

test('VENCIMENTO_INCOERENTE antes da emissão ou distante demais', () => {
  assert.deepEqual(codigos(validarNota(notaValida({ vencimento: '2026-09-09' }), CONTEXTO)), ['VENCIMENTO_INCOERENTE']);
  assert.deepEqual(codigos(validarNota(notaValida({ vencimento: '2027-01-09' }), CONTEXTO)), ['VENCIMENTO_INCOERENTE']);
  assert.deepEqual(codigos(validarNota(notaValida({ vencimento: '2027-01-08' }), CONTEXTO)), []);
});

test('NOTA_SUBSTITUTA usa o número da original quando ela está na planilha', () => {
  const contexto = { ...CONTEXTO, linhasNotas: [{ chave_duplicidade: 'ABC123', numero: '1100' }] };
  assert.equal(validarNota(notaValida({ chave_nota_substituida: 'ABC123' }), contexto)[0].texto, 'Substitui a nota 1100; confira se a original já foi aprovada ou paga.');
  assert.equal(validarNota(notaValida({ chave_nota_substituida: 'XYZ' }), CONTEXTO)[0].texto, 'Substitui a nota XYZ; confira se a original já foi aprovada ou paga.');
});

test('formatação de motivos e observações', () => {
  assert.equal(formatarMotivos([criarMotivo('SEM_ANEXO'), criarMotivo('CNPJ_INVALIDO', { parte: 'tomador' })]),
    '[SEM_ANEXO] E-mail sem anexo aproveitável; a nota pode estar num link de portal.\n[CNPJ_INVALIDO] CNPJ do tomador inválido.');
  assert.equal(formatarObservacoes(['SEM_VENCIMENTO', 'SEM_VENCIMENTO']), '[SEM_VENCIMENTO] Sem vencimento: confira o boleto ou combine a data com o fornecedor.');
  assert.equal(formatarObservacoes([]), '');
  assert.equal(juntarObservacao('', 'Substituída pela nota 12'), 'Substituída pela nota 12');
  assert.equal(juntarObservacao('A\nSubstituída pela nota 12', 'Substituída pela nota 12'), 'A\nSubstituída pela nota 12');
  assert.equal(juntarObservacao('A', 'B'), 'A\nB');
});
