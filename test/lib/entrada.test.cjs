const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { padronizarEmail, padronizarFormulario, resolverEmpresa } = require('../../src/lib/entrada.cjs');
const { mapearEtiquetas, consultaSemEtiquetasNf } = require('../../src/lib/gmail.cjs');

const sha256 = (texto) => crypto.createHash('sha256').update(texto).digest('hex');

const EMPRESAS = [
  { row_number: 2, apelido: 'Colmeia', endereco_destino: 'desafioimphub+colmeia@gmail.com', empresa: 'Colmeia Espaços Colaborativos Ltda.', cnpj: '11.222.333/0001-81' },
  { row_number: 3, apelido: 'Maré', endereco_destino: 'desafioimphub+mare@gmail.com', empresa: 'Maré Eventos de Impacto Ltda.', cnpj: '12.ABC.345/01DE-35' },
];

test('padronizarEmail monta o pacote a partir da mensagem do Gmail', () => {
  const anexos = [{ chave: 'attachment_0', nome: 'nota.xml', mime: 'text/xml', tamanho_bytes: 10, hash: 'aa', base64: 'PA==' }];
  const pacote = padronizarEmail({
    id: '18f1a2b3c4d5e6f7',
    date: '2026-09-15T13:00:00.000Z',
    to: { value: [{ address: 'DesafioImpHub+Colmeia@gmail.com', name: '' }] },
    cc: { value: [{ address: 'outra@exemplo.com' }] },
    text: '  Segue a nota. Vencimento 20/09/2026.  ',
    html: '<p>ignorado</p>',
  }, anexos);
  assert.deepEqual(pacote, {
    origem: 'email',
    origem_id: '18f1a2b3c4d5e6f7',
    message_id: '18f1a2b3c4d5e6f7',
    recebido_em: '2026-09-15 10:00',
    destinatarios: ['desafioimphub+colmeia@gmail.com', 'outra@exemplo.com'],
    empresa_escolhida: null,
    empresa: null,
    corpo_texto: 'Segue a nota. Vencimento 20/09/2026.',
    vencimento_informado: null,
    enviado_por: '',
    anexos,
    motivos_pacote: [],
  });
});

test('padronizarEmail usa o HTML quando não há texto', () => {
  const pacote = padronizarEmail({ id: 'x', date: '2026-09-15T13:00:00Z', html: '<div>Pagar até <b>30/09/2026</b></div>' }, []);
  assert.equal(pacote.corpo_texto, 'Pagar até 30/09/2026');
  assert.deepEqual(pacote.destinatarios, []);
});

test('padronizarFormulario gera origem_id determinístico e independente da ordem', () => {
  const envio = { empresa: 'Maré', vencimento: '2026-10-05', observacao: ' Nota do evento ', submittedAt: '2026-09-15T13:00:00.000Z', user: { email: 'financeiro@exemplo.com' } };
  const a = padronizarFormulario(envio, [{ hash: 'bb' }, { hash: 'aa' }], sha256);
  const b = padronizarFormulario(envio, [{ hash: 'aa' }, { hash: 'bb' }], sha256);
  assert.equal(a.origem_id, `form-${sha256('Maré|aa|bb').slice(0, 16)}`);
  assert.equal(a.origem_id, b.origem_id);
  assert.equal(a.vencimento_informado, '2026-10-05');
  assert.equal(a.corpo_texto, 'Nota do evento');
  assert.equal(a.enviado_por, 'financeiro@exemplo.com');
  assert.equal(a.message_id, null);
});

test('padronizarFormulario aceita campos opcionais vazios', () => {
  const pacote = padronizarFormulario({ Empresa: 'Colmeia', submittedAt: '2026-09-15T13:00:00Z' }, [], sha256);
  assert.equal(pacote.empresa_escolhida, 'Colmeia');
  assert.equal(pacote.vencimento_informado, null);
  assert.equal(pacote.corpo_texto, '');
  assert.equal(pacote.enviado_por, '');
});

test('resolverEmpresa encontra pelo endereço ou pelo apelido e marca desconhecida', () => {
  const email = resolverEmpresa({ origem: 'email', destinatarios: ['desafioimphub+mare@gmail.com'], motivos_pacote: [] }, EMPRESAS);
  assert.deepEqual(email.empresa, { apelido: 'Maré', nome: 'Maré Eventos de Impacto Ltda.', cnpj: '12ABC34501DE35' });
  const formulario = resolverEmpresa({ origem: 'formulario', empresa_escolhida: 'Colmeia', destinatarios: [], motivos_pacote: [] }, EMPRESAS);
  assert.equal(formulario.empresa.cnpj, '11222333000181');
  const desconhecida = resolverEmpresa({ origem: 'email', destinatarios: ['outra@exemplo.com'], motivos_pacote: [] }, EMPRESAS);
  assert.equal(desconhecida.empresa, null);
  assert.deepEqual(desconhecida.motivos_pacote, ['EMPRESA_DESCONHECIDA']);
});

test('mapearEtiquetas devolve ids e falha quando falta etiqueta', () => {
  const labels = [
    { id: 'Label_1', name: 'NF/processada' }, { id: 'Label_2', name: 'NF/revisao' },
    { id: 'Label_3', name: 'NF/duplicada' }, { id: 'Label_4', name: 'NF/erro' }, { id: 'INBOX', name: 'INBOX' },
  ];
  assert.deepEqual(mapearEtiquetas(labels), { 'NF/processada': 'Label_1', 'NF/revisao': 'Label_2', 'NF/duplicada': 'Label_3', 'NF/erro': 'Label_4' });
  assert.throws(() => mapearEtiquetas(labels.slice(1)), /NF\/processada/);
});

test('consultaSemEtiquetasNf usa a sintaxe de busca do Gmail', () => {
  assert.equal(consultaSemEtiquetasNf(), '-label:nf-processada -label:nf-revisao -label:nf-duplicada -label:nf-erro');
});
