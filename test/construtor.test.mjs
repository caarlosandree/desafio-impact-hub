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

import { definirPrincipal } from '../n8n/definicoes/principal.mjs';

test('NF · Recepção e extração: configurações, gatilhos e error workflow', () => {
  const json = definirPrincipal(config).json();
  assert.equal(json.id, 'NFrecepcaoExtr01');
  assert.equal(json.name, 'NF · Recepção e extração');
  assert.deepEqual(
    { executionOrder: json.settings.executionOrder, timezone: json.settings.timezone, errorWorkflow: json.settings.errorWorkflow, binaryMode: json.settings.binaryMode },
    { executionOrder: 'v1', timezone: 'America/Sao_Paulo', errorWorkflow: 'NFerrosAlerta001', binaryMode: 'separate' },
  );
  const tipos = json.nodes.map((n) => n.type);
  for (const gatilho of ['n8n-nodes-base.gmailTrigger', 'n8n-nodes-base.formTrigger', 'n8n-nodes-base.scheduleTrigger']) {
    assert.equal(tipos.filter((t) => t === gatilho).length, 1, gatilho);
  }
  const gmail = json.nodes.find((n) => n.type === 'n8n-nodes-base.gmailTrigger');
  assert.equal(gmail.parameters.filters.q, 'in:inbox -label:nf-processada -label:nf-revisao -label:nf-duplicada -label:nf-erro');
  assert.equal(gmail.parameters.pollTimes.item[0].value, 5);
  assert.equal(json.nodes.find((n) => n.type === 'n8n-nodes-base.scheduleTrigger').parameters.rule.interval[0].expression, '0 0 8-19 * * *');
});

test('todo node com saída de erro leva a Falha técnica', () => {
  const json = definirPrincipal(config).json();
  const comSaidaDeErro = json.nodes.filter((n) => n.onError === 'continueErrorOutput');
  assert.ok(comSaidaDeErro.length >= 10);
  for (const node of comSaidaDeErro) {
    assert.equal(json.connections[node.name]?.main?.[1]?.[0]?.node, 'Falha técnica', node.name);
  }
});

test("todo $('Node') citado nos códigos existe no workflow", () => {
  const json = definirPrincipal(config).json();
  const nomes = new Set(json.nodes.map((n) => n.name));
  for (const node of json.nodes.filter((n) => n.type === 'n8n-nodes-base.code')) {
    for (const [, citado] of node.parameters.jsCode.matchAll(/\$\('([^']+)'\)/g)) {
      assert.ok(nomes.has(citado), `${node.name} cita ${citado}`);
    }
  }
  for (const node of json.nodes) {
    for (const [, citado] of JSON.stringify(node.parameters).matchAll(/\$\('([^'\\]+)'\)/g)) {
      assert.ok(nomes.has(citado), `${node.name} cita ${citado}`);
    }
  }
});

test('o loop fecha nos dois caminhos e as credenciais são as fixas', () => {
  const json = definirPrincipal(config).json();
  const voltamAoLoop = Object.entries(json.connections)
    .filter(([, { main }]) => main.some((saida) => saida.some((destino) => destino.node === 'Um e-mail por vez')))
    .map(([origem]) => origem).sort();
  assert.deepEqual(voltamAoLoop, ['Resolver empresa', 'Resultado com falha', 'Resultado do pacote']);
  const ids = new Set(json.nodes.flatMap((n) => Object.values(n.credentials ?? {}).map((c) => c.id)));
  assert.deepEqual([...ids].sort(), ['nfDriveOAuth0001', 'nfGeminiApiKey01', 'nfGmailOAuth0001', 'nfPlanilhasOAuth', 'nfSmtpAlertas001']);
});

test('Configuração embute os parâmetros da spec', () => {
  const json = definirPrincipal(config).json();
  const configuracao = json.nodes.find((n) => n.name === 'Configuração').parameters.jsCode;
  for (const chave of ['modelo_gemini', 'planilha_id', 'pasta_raiz_id', 'emissao_max_dias', 'vencimento_max_dias', 'imagem_min_kb', 'varredura_idade_min_minutos', 'emails_alerta', 'simular_falha_registro']) {
    assert.ok(configuracao.includes(`"${chave}"`), chave);
  }
});

import { definirApoio } from '../n8n/definicoes/apoio.mjs';

test('NF · Apoio aos testes expõe os três webhooks locais', () => {
  const json = definirApoio(config).json();
  assert.equal(json.id, 'NFapoioTestes001');
  const caminhos = json.nodes.filter((n) => n.type === 'n8n-nodes-base.webhook').map((n) => `${n.parameters.httpMethod} ${n.parameters.path}`).sort();
  assert.deepEqual(caminhos, ['GET nf-teste-estado', 'POST nf-teste-limpar', 'POST nf-teste-reprocessar']);
  assert.equal(json.nodes.filter((n) => n.type === 'n8n-nodes-base.respondToWebhook').length, 3);
});
