import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { montarCodigo, uuidDeterministico, Workflow } from '../n8n/construtor.mjs';
import { definirErros } from '../n8n/definicoes/erros.mjs';

const config = JSON.parse(readFileSync(new URL('../n8n/config.exemplo.json', import.meta.url), 'utf8'));
const SUBSTITUICOES = { __CONFIG__: '{}', __CAMPO__: 'notas' };

function nomesDeclarados(codigoMontado) {
  return [...codigoMontado.matchAll(/^(?:async\s+)?(?:function|const|let|class)\s+([A-Za-z_$][\w$]*)/gm)].map((m) => m[1]);
}

test('montarCodigo embute dependências antes de quem usa e remove linhas @node-only', () => {
  const codigo = montarCodigo('montar-alerta-erro.js', { __CONFIG__: '{"emails_alerta":"a@b"}' });
  assert.equal(codigo.includes('@node-only'), false);
  assert.equal(codigo.includes("require('./"), false);
  assert.equal(codigo.includes('__CONFIG__'), false);
  assert.ok(codigo.indexOf('function truncar') < codigo.indexOf('function alertaErrorWorkflow'));
  assert.ok(codigo.indexOf('function linhasValidas') < codigo.indexOf('function contarErrosRecentes'));
});

test('todo código de node monta sem nomes repetidos e com sintaxe válida', () => {
  for (const arquivo of readdirSync(new URL('../n8n/codigo/', import.meta.url))) {
    const codigo = montarCodigo(arquivo, SUBSTITUICOES);
    const nomes = nomesDeclarados(codigo);
    const repetidos = nomes.filter((nome, indice) => nomes.indexOf(nome) !== indice);
    assert.deepEqual(repetidos, [], `${arquivo} declara nomes repetidos`);
    assert.doesNotThrow(() => new Function(`return (async function () {\n${codigo}\n});`), `${arquivo} tem erro de sintaxe`);
  }
});

test('uuidDeterministico é estável e tem formato de UUID', () => {
  assert.equal(uuidDeterministico('a'), uuidDeterministico('a'));
  assert.match(uuidDeterministico('a'), /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-a[0-9a-f]{3}-[0-9a-f]{12}$/);
});

test('Workflow recusa node repetido e conexão para node inexistente', () => {
  const wf = new Workflow({ id: 'X', nome: 'X', configuracoes: {} });
  wf.no('A', 'n8n-nodes-base.noOp', 1, {});
  assert.throws(() => wf.no('A', 'n8n-nodes-base.noOp', 1, {}), /repetido/);
  wf.ligar('A', 'B');
  assert.throws(() => wf.json(), /B/);
});

test('NF · Erros: gatilho de erro -> código -> SMTP, sem segredo no JSON', () => {
  const json = definirErros(config).json();
  assert.equal(json.id, 'NFerrosAlerta001');
  assert.equal(json.name, 'NF · Erros');
  assert.deepEqual(json.nodes.map((n) => n.type), ['n8n-nodes-base.errorTrigger', 'n8n-nodes-base.code', 'n8n-nodes-base.emailSend']);
  assert.equal(json.connections['Erro em workflow de NF'].main[0][0].node, 'Montar alerta');
  assert.equal(json.connections['Montar alerta'].main[0][0].node, 'Enviar alerta');
  assert.deepEqual(json.nodes[2].credentials, { smtp: { id: 'nfSmtpAlertas001', name: 'NF · SMTP alertas' } });
  assert.equal(/password|senha_app|api_key/i.test(JSON.stringify(json)), false);
});
