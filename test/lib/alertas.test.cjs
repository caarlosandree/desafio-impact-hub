const test = require('node:test');
const assert = require('node:assert/strict');
const a = require('../../src/lib/alertas.cjs');

test('linkDaExecucao e mensagemDoErro', () => {
  assert.equal(a.linkDaExecucao('http://localhost:5678/', 'W1', '42'), 'http://localhost:5678/workflow/W1/executions/42');
  assert.equal(a.mensagemDoErro('texto'), 'texto');
  assert.equal(a.mensagemDoErro({ message: 'API key not valid' }), 'API key not valid');
  assert.equal(a.mensagemDoErro({ description: 'sem message' }), 'sem message');
  assert.equal(a.mensagemDoErro(null), 'Erro desconhecido');
});

test('ocorrência e alerta de erro técnico só com identificadores', () => {
  const base = { agora: '2026-09-15 10:05', origemId: 'msg-9', no: 'Gemini · ler documentos', mensagem: 'API key not valid', link: 'http://n8n/e/1' };
  assert.deepEqual(a.ocorrenciaErroTecnico(base), {
    data_hora: '2026-09-15 10:05', tipo: 'ERRO_TECNICO', origem_id: 'msg-9', nota_id: '',
    descricao: 'Falha no node "Gemini · ler documentos": API key not valid', link_execucao: 'http://n8n/e/1',
  });
  const email = a.alertaErroTecnico({ ...base, origem: 'email' });
  assert.equal(email.assunto, '[NF] Erro técnico em "Gemini · ler documentos"');
  assert.match(email.texto, /tire a etiqueta NF\/erro/);
  assert.match(email.texto, /http:\/\/n8n\/e\/1/);
  assert.match(a.alertaErroTecnico({ ...base, origem: 'formulario' }).texto, /mesmos arquivos/);
});

test('contarErrosRecentes considera só ERRO_TECNICO das últimas 24 horas', () => {
  const agora = new Date('2026-09-15T13:00:00Z');
  const linhas = [
    { data_hora: '2026-09-14 09:00', tipo: 'ERRO_TECNICO' },
    { data_hora: '2026-09-15 07:00', tipo: 'ERRO_TECNICO' },
    { data_hora: '2026-09-15 08:00', tipo: 'DUPLICATA_NOTA' },
    {},
  ];
  assert.equal(a.contarErrosRecentes(linhas, agora), 1);
});

test('sinal de vida normal e com falha de leitura', () => {
  const normal = a.textoSinalDeVida({ agora: new Date('2026-09-15T11:00:00Z'), pendentes: 2, revisoes: 3, errosTecnicos: 0, falhas: [] });
  assert.equal(normal.assunto, '[NF] Sinal de vida');
  assert.match(normal.texto, /2026-09-15 08:00/);
  assert.match(normal.texto, /E-mails pendentes encontrados pela varredura: 2/);
  assert.match(normal.texto, /Notas em revisão: 3/);
  const falha = a.textoSinalDeVida({ agora: new Date('2026-09-15T11:00:00Z'), pendentes: 0, revisoes: null, errosTecnicos: null, falhas: ['a planilha'] });
  assert.equal(falha.assunto, '[NF] Sinal de vida com falhas');
  assert.match(falha.texto, /Notas em revisão: não foi possível ler/);
  assert.match(falha.texto, /não foi possível ler a planilha/);
});

test('alerta do Error Workflow', () => {
  const alerta = a.alertaErrorWorkflow({ execution: { id: '9', url: 'http://n8n/e/9', error: { message: 'boom' }, lastNodeExecuted: 'Ler empresas' }, workflow: { id: 'W', name: 'NF · Recepção e extração' } });
  assert.equal(alerta.assunto, '[NF] Falha inesperada no workflow "NF · Recepção e extração"');
  assert.match(alerta.texto, /Ler empresas/);
  assert.match(alerta.texto, /boom/);
  assert.match(alerta.texto, /http:\/\/n8n\/e\/9/);
});

test('mensagemFormulario resume cada situação', () => {
  const texto = a.mensagemFormulario([{ falha: false, resultado: [
    { situacao: 'registrada', id: 'a', numero: '1', status: 'Extraída', motivos: '' },
    { situacao: 'registrada', id: 'b', numero: '2', status: 'Revisão', motivos: '[CNPJ_INVALIDO] CNPJ do tomador inválido.' },
    { situacao: 'ja_registrada', id: 'c', numero: '3', status: 'Extraída', motivos: '' },
    { situacao: 'duplicata', id: 'd', numero: '4', status: '', motivos: '' },
    { situacao: 'registrada', id: 'e', numero: '', status: 'Revisão', motivos: '[SEM_ANEXO] E-mail sem anexo aproveitável.' },
  ] }]);
  assert.equal(texto, [
    'Nota 1: registrada como Extraída.',
    'Nota 2: registrada em Revisão. [CNPJ_INVALIDO] CNPJ do tomador inválido.',
    'Nota 3: já estava registrada (status Extraída).',
    'Nota 4: já registrada antes (id d); não foi gravada de novo.',
    'Envio sem nota identificada: registrado em Revisão. [SEM_ANEXO] E-mail sem anexo aproveitável.',
  ].join('\n'));
  assert.match(a.mensagemFormulario([{ falha: true, resultado: [] }]), /envie de novo os mesmos arquivos/);
});
