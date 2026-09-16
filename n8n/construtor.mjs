import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export const IDS = { principal: 'NFrecepcaoExtr01', erros: 'NFerrosAlerta001', apoio: 'NFapoioTestes001' };

export const CREDENCIAIS = {
  gmail: { gmailOAuth2: { id: 'nfGmailOAuth0001', name: 'NF · Gmail' } },
  planilhas: { googleSheetsOAuth2Api: { id: 'nfPlanilhasOAuth', name: 'NF · Google Planilhas' } },
  drive: { googleDriveOAuth2Api: { id: 'nfDriveOAuth0001', name: 'NF · Google Drive' } },
  gemini: { httpHeaderAuth: { id: 'nfGeminiApiKey01', name: 'NF · Gemini API' } },
  smtp: { smtp: { id: 'nfSmtpAlertas001', name: 'NF · SMTP alertas' } },
};

export const TENTATIVAS = { retryOnFail: true, maxTries: 3, waitBetweenTries: 5000 };
export const REFERENCIA_CONFIG = "$('Configuração').first().json.config";

export function uuidDeterministico(texto) {
  const h = createHash('sha1').update(texto).digest('hex');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`;
}

export function removerLinhasNode(fonte) {
  return `${fonte.split('\n').filter((linha) => !linha.includes('// @node-only')).join('\n').trim()}\n`;
}

export function montarCodigo(arquivo, substituicoes = {}) {
  const corpo = readFileSync(path.join(RAIZ, 'n8n/codigo', arquivo), 'utf8');
  const cabecalho = corpo.match(/^\/\/ @libs (.+)$/m);
  const pedidas = cabecalho ? cabecalho[1].split(/[\s,]+/).filter(Boolean) : [];
  const ordem = [];
  const visitando = new Set();
  const visitar = (nome) => {
    if (ordem.includes(nome)) return;
    if (visitando.has(nome)) throw new Error(`Dependência circular em ${nome}.cjs`);
    visitando.add(nome);
    const fonte = readFileSync(path.join(RAIZ, 'src/lib', `${nome}.cjs`), 'utf8');
    for (const [, dependencia] of fonte.matchAll(/require\('\.\/([\w-]+)\.cjs'\)/g)) visitar(dependencia);
    ordem.push(nome);
  };
  pedidas.forEach(visitar);
  const partes = ordem.map((nome) => `// ----- src/lib/${nome}.cjs -----\n${removerLinhasNode(readFileSync(path.join(RAIZ, 'src/lib', `${nome}.cjs`), 'utf8'))}`);
  partes.push(`// ----- n8n/codigo/${arquivo} -----\n${removerLinhasNode(corpo.replace(/^\/\/ @libs .+\n/m, ''))}`);
  let codigoFinal = partes.join('\n');
  for (const [marcador, valor] of Object.entries(substituicoes)) codigoFinal = codigoFinal.split(marcador).join(valor);
  return codigoFinal;
}

// Nodes de webhook e de formulário só são registrados pelo n8n quando trazem um webhookId próprio.
const TIPOS_COM_WEBHOOK = new Set(['n8n-nodes-base.webhook', 'n8n-nodes-base.formTrigger']);

export class Workflow {
  constructor({ id, nome, configuracoes }) {
    this.id = id;
    this.nome = nome;
    this.configuracoes = configuracoes;
    this.nos = [];
    this.conexoes = {};
  }

  no(nome, tipo, versao, parametros, { posicao = [0, 0], credenciais, extras = {} } = {}) {
    if (this.nos.some((existente) => existente.name === nome)) throw new Error(`Node repetido: ${nome}`);
    this.nos.push({
      id: uuidDeterministico(`${this.id}:${nome}`),
      name: nome,
      type: tipo,
      typeVersion: versao,
      position: [posicao[0] * 260, posicao[1] * 200],
      parameters: parametros,
      ...(credenciais ? { credentials: credenciais } : {}),
      ...(TIPOS_COM_WEBHOOK.has(tipo) ? { webhookId: uuidDeterministico(`${this.id}:${nome}:webhook`) } : {}),
      ...extras,
    });
    return nome;
  }

  ligar(de, para, { saida = 0, entrada = 0 } = {}) {
    const origem = (this.conexoes[de] ??= { main: [] });
    while (origem.main.length <= saida) origem.main.push([]);
    origem.main[saida].push({ node: para, type: 'main', index: entrada });
  }

  json() {
    const nomes = new Set(this.nos.map((no) => no.name));
    for (const [origem, { main }] of Object.entries(this.conexoes)) {
      if (!nomes.has(origem)) throw new Error(`Conexão sai de node inexistente: ${origem}`);
      for (const destinos of main) {
        for (const destino of destinos) {
          if (!nomes.has(destino.node)) throw new Error(`Conexão ${origem} → ${destino.node}: destino inexistente`);
        }
      }
    }
    const corpo = { name: this.nome, nodes: this.nos, connections: this.conexoes, settings: this.configuracoes };
    return { id: this.id, ...corpo, active: false, pinData: {}, meta: { templateCredsSetupCompleted: true }, tags: [], versionId: uuidDeterministico(JSON.stringify(corpo)) };
  }
}

export const expr = (js) => `={{ ${js} }}`;

function filtroBooleano(expressao) {
  return {
    options: { caseSensitive: true, leftValue: '', typeValidation: 'strict', version: 2 },
    conditions: [{ id: uuidDeterministico(expressao), leftValue: expr(expressao), rightValue: '', operator: { type: 'boolean', operation: 'true', singleValue: true } }],
    combinator: 'and',
  };
}

export function se(expressao) {
  return { conditions: filtroBooleano(expressao), looseTypeValidation: false, options: {} };
}

export function regras(lista) {
  return {
    mode: 'rules',
    rules: { values: lista.map(([saida, expressao]) => ({ conditions: filtroBooleano(expressao), renameOutput: true, outputKey: saida })) },
    looseTypeValidation: false,
    options: {},
  };
}

export function codigo(arquivo, substituicoes) {
  return { mode: 'runOnceForAllItems', language: 'javaScript', jsCode: montarCodigo(arquivo, substituicoes) };
}

export function planilha(aba, idFixo) {
  return {
    authentication: 'oAuth2',
    resource: 'sheet',
    documentId: { __rl: true, mode: 'id', value: idFixo ?? expr(`${REFERENCIA_CONFIG}.planilha_id`) },
    sheetName: { __rl: true, mode: 'name', value: aba },
  };
}

export function emailSmtp(base = '$json') {
  return {
    resource: 'email', operation: 'send',
    fromEmail: expr(`${base}.de`), toEmail: expr(`${base}.para`), subject: expr(`${base}.assunto`),
    emailFormat: 'text', text: expr(`${base}.texto`), options: { appendAttribution: false },
  };
}
