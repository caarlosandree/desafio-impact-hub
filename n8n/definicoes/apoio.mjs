import { Workflow, IDS, CREDENCIAIS, codigo, expr, se, planilha } from '../construtor.mjs';

const LEITURA = { executeOnce: true, alwaysOutputData: true };

export function definirApoio(config) {
  const planilhaId = config.configuracao.planilha_id;
  const wf = new Workflow({ id: IDS.apoio, nome: 'NF · Apoio aos testes', configuracoes: { executionOrder: 'v1', timezone: 'America/Sao_Paulo', binaryMode: 'separate' } });
  const no = (nome, tipo, versao, parametros, posicao, opcoes = {}) => wf.no(nome, tipo, versao, parametros, { posicao, ...opcoes });
  const webhook = (nome, metodo, caminho, posicao) => no(nome, 'n8n-nodes-base.webhook', 2, { httpMethod: metodo, path: caminho, responseMode: 'responseNode', options: {} }, posicao);
  const responder = (nome, posicao) => no(nome, 'n8n-nodes-base.respondToWebhook', 1.1, { respondWith: 'json', responseBody: expr('JSON.stringify($json)'), options: {} }, posicao, { extras: { executeOnce: true } });
  const gmail = (nome, parametros, posicao, extras = {}) => no(nome, 'n8n-nodes-base.gmail', 2.1, { authentication: 'oAuth2', ...parametros }, posicao, { credenciais: CREDENCIAIS.gmail, extras });
  const ler = (nome, aba, posicao) => no(nome, 'n8n-nodes-base.googleSheets', 4.7, { ...planilha(aba, planilhaId), operation: 'read', filtersUI: {}, options: {} }, posicao, { credenciais: CREDENCIAIS.planilhas, extras: LEITURA });
  const limpar = (nome, aba, posicao) => no(nome, 'n8n-nodes-base.googleSheets', 4.7, { ...planilha(aba, planilhaId), operation: 'clear', clear: 'wholeSheet', keepFirstRow: true }, posicao, { credenciais: CREDENCIAIS.planilhas, extras: { executeOnce: true } });
  const ligar = (de, para, saida = 0) => wf.ligar(de, para, { saida });

  webhook('Pedido de estado', 'GET', 'nf-teste-estado', [0, 0]);
  gmail('Etiquetas (estado)', { resource: 'label', operation: 'getAll', returnAll: true }, [1, 0], LEITURA);
  ler('Notas (estado)', 'Notas', [2, 0]);
  ler('Arquivos (estado)', 'Arquivos', [3, 0]);
  ler('Ocorrências (estado)', 'Ocorrências', [4, 0]);
  gmail('E-mails de teste', { resource: 'message', operation: 'getAll', returnAll: true, simple: false, filters: { q: 'subject:"[T" newer_than:7d', readStatus: 'both' }, options: {} }, [5, 0], LEITURA);
  no('Montar estado', 'n8n-nodes-base.code', 2, codigo('montar-estado.js'), [6, 0]);
  responder('Responder estado', [7, 0]);
  ['Pedido de estado', 'Etiquetas (estado)', 'Notas (estado)', 'Arquivos (estado)', 'Ocorrências (estado)', 'E-mails de teste', 'Montar estado', 'Responder estado']
    .reduce((anterior, atual) => { ligar(anterior, atual); return atual; });

  webhook('Pedido de limpeza', 'POST', 'nf-teste-limpar', [0, 2]);
  limpar('Limpar Notas', 'Notas', [1, 2]);
  limpar('Limpar Arquivos', 'Arquivos', [2, 2]);
  limpar('Limpar Ocorrências', 'Ocorrências', [3, 2]);
  gmail('E-mails a apagar', { resource: 'message', operation: 'getAll', returnAll: true, simple: true, filters: { q: 'subject:"[T"', readStatus: 'both' } }, [4, 2], LEITURA);
  no('Tem e-mail a apagar?', 'n8n-nodes-base.if', 2.2, se('Boolean($json.id)'), [5, 2]);
  gmail('Apagar e-mail', { resource: 'message', operation: 'delete', messageId: expr('$json.id') }, [6, 2]);
  no('Resumo da limpeza', 'n8n-nodes-base.code', 2, codigo('resumo-simples.js'), [7, 2]);
  responder('Responder limpeza', [8, 2]);
  ['Pedido de limpeza', 'Limpar Notas', 'Limpar Arquivos', 'Limpar Ocorrências', 'E-mails a apagar', 'Tem e-mail a apagar?']
    .reduce((anterior, atual) => { ligar(anterior, atual); return atual; });
  ligar('Tem e-mail a apagar?', 'Apagar e-mail', 0);
  ligar('Tem e-mail a apagar?', 'Resumo da limpeza', 1);
  ligar('Apagar e-mail', 'Resumo da limpeza');
  ligar('Resumo da limpeza', 'Responder limpeza');

  webhook('Pedido de reprocessamento', 'POST', 'nf-teste-reprocessar', [0, 4]);
  gmail('Etiquetas (reprocessar)', { resource: 'label', operation: 'getAll', returnAll: true }, [1, 4], LEITURA);
  gmail('E-mail com erro', {
    resource: 'message', operation: 'getAll', returnAll: true, simple: true,
    filters: { q: expr(`'subject:"' + $('Pedido de reprocessamento').first().json.query.assunto + '" label:nf-erro'`), readStatus: 'both' },
  }, [2, 4], LEITURA);
  no('Tem e-mail com erro?', 'n8n-nodes-base.if', 2.2, se('Boolean($json.id)'), [3, 4]);
  gmail('Tirar NF/erro', {
    resource: 'message', operation: 'removeLabels', messageId: expr('$json.id'),
    labelIds: expr("[$('Etiquetas (reprocessar)').all().find((item) => item.json.name === 'NF/erro').json.id]"),
  }, [4, 4]);
  no('Resumo do reprocessamento', 'n8n-nodes-base.code', 2, codigo('resumo-simples.js'), [5, 4]);
  responder('Responder reprocessamento', [6, 4]);
  ligar('Pedido de reprocessamento', 'Etiquetas (reprocessar)');
  ligar('Etiquetas (reprocessar)', 'E-mail com erro');
  ligar('E-mail com erro', 'Tem e-mail com erro?');
  ligar('Tem e-mail com erro?', 'Tirar NF/erro', 0);
  ligar('Tem e-mail com erro?', 'Resumo do reprocessamento', 1);
  ligar('Tirar NF/erro', 'Resumo do reprocessamento');
  ligar('Resumo do reprocessamento', 'Responder reprocessamento');
  return wf;
}
