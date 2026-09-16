import { createRequire } from 'node:module';
import { Workflow, IDS, CREDENCIAIS, TENTATIVAS, REFERENCIA_CONFIG, codigo, expr, se, regras, planilha, emailSmtp } from '../construtor.mjs';

const require = createRequire(import.meta.url);
const { consultaSemEtiquetasNf } = require('../../src/lib/gmail.cjs');

const LEITURA = { executeOnce: true, alwaysOutputData: true };
const SAIDA_DE_ERRO = { onError: 'continueErrorOutput' };
const SEGUE_COM_ERRO = { onError: 'continueRegularOutput' };
const MEU_DRIVE = { __rl: true, mode: 'list', value: 'My Drive' };

export function definirPrincipal(config) {
  const { configuracao, gatilhos } = config;
  const semEtiqueta = consultaSemEtiquetasNf();
  const idadeMinima = expr(`$now.minus({ minutes: ${REFERENCIA_CONFIG}.varredura_idade_min_minutos }).toISO()`);
  const wf = new Workflow({
    id: IDS.principal,
    nome: 'NF · Recepção e extração',
    configuracoes: {
      executionOrder: 'v1', timezone: 'America/Sao_Paulo', errorWorkflow: IDS.erros, saveManualExecutions: false,
      saveDataSuccessExecution: 'none', saveDataErrorExecution: 'all', callerPolicy: 'workflowsFromSameOwner', binaryMode: 'separate',
    },
  });
  const no = (nome, tipo, versao, parametros, posicao, opcoes = {}) => wf.no(nome, tipo, versao, parametros, { posicao, ...opcoes });
  const code = (nome, arquivo, posicao, opcoes = {}, substituicoes = {}) => no(nome, 'n8n-nodes-base.code', 2, codigo(arquivo, substituicoes), posicao, opcoes);
  const seNo = (nome, expressao, posicao) => no(nome, 'n8n-nodes-base.if', 2.2, se(expressao), posicao);
  const ler = (nome, aba, posicao, extras, filtrosUI = {}) => no(nome, 'n8n-nodes-base.googleSheets', 4.7, { ...planilha(aba), operation: 'read', filtersUI: filtrosUI, options: {} }, posicao, { credenciais: CREDENCIAIS.planilhas, extras });
  const gravar = (nome, aba, operacao, posicao, extras, colunaChave) => no(nome, 'n8n-nodes-base.googleSheets', 4.7, {
    ...planilha(aba), operation: operacao,
    columns: { mappingMode: 'autoMapInputData', value: {}, matchingColumns: colunaChave ? [colunaChave] : [], schema: [] },
    options: { cellFormat: 'RAW', handlingExtraData: 'error' },
  }, posicao, { credenciais: CREDENCIAIS.planilhas, extras });
  const ligar = (de, para, saida = 0) => wf.ligar(de, para, { saida });

  // Entradas
  no('Gmail · novos e-mails', 'n8n-nodes-base.gmailTrigger', 1.4, {
    authentication: 'oAuth2',
    pollTimes: { item: [{ mode: 'everyX', value: gatilhos.gmail_minutos, unit: 'minutes' }] },
    simple: false,
    maxResults: 50,
    filters: { q: `in:inbox ${semEtiqueta}`, readStatus: 'both', includeSpamTrash: false },
    options: { downloadAttachments: true, dataPropertyAttachmentsPrefixName: 'attachment_' },
  }, [0, 0], { credenciais: CREDENCIAIS.gmail });
  code('Padronizar e-mail', 'padronizar-email.js', [1, 0]);
  no('Formulário de notas', 'n8n-nodes-base.formTrigger', 2.6, {
    authentication: 'n8nUserAuth',
    requireExecuteAccess: false,
    formTitle: 'Enviar nota fiscal',
    formDescription: 'Use quando a nota não chegou por e-mail (por exemplo, baixada de um portal). O resultado aparece no fim do envio.',
    formFields: {
      values: [
        { fieldLabel: 'Empresa', fieldName: 'empresa', fieldType: 'dropdown', fieldOptions: { values: configuracao.formulario_empresas.map((option) => ({ option })) }, requiredField: true },
        { fieldLabel: 'Arquivos da nota', fieldName: 'arquivos', fieldType: 'file', multipleFiles: true, acceptFileTypes: '.pdf,.xml,.jpg,.jpeg,.png', requiredField: true },
        { fieldLabel: 'Vencimento (opcional)', fieldName: 'vencimento', fieldType: 'date' },
        { fieldLabel: 'Observação (opcional)', fieldName: 'observacao', fieldType: 'textarea' },
      ],
    },
    responseMode: 'lastNode',
    options: { path: 'nf-envio', buttonLabel: 'Enviar', appendAttribution: false },
  }, [0, 1]);
  code('Padronizar formulário', 'padronizar-formulario.js', [1, 1]);
  no('Varredura horária', 'n8n-nodes-base.scheduleTrigger', 1.2, { rule: { interval: [{ field: 'cronExpression', expression: gatilhos.varredura_cron }] } }, [0, 2]);
  code('Marcar varredura', 'marcar-varredura.js', [1, 2]);
  code('Configuração', 'configuracao.js', [2, 1], {}, { __CONFIG__: JSON.stringify(configuracao, null, 2) });
  no('Listar etiquetas', 'n8n-nodes-base.gmail', 2.1, { authentication: 'oAuth2', resource: 'label', operation: 'getAll', returnAll: true }, [3, 1], { credenciais: CREDENCIAIS.gmail, extras: { ...LEITURA, ...TENTATIVAS } });
  ler('Ler empresas', 'Empresas', [4, 1], { ...LEITURA, ...TENTATIVAS });
  code('Retomar entrada', 'retomar-entrada.js', [5, 1]);
  no('Origem', 'n8n-nodes-base.switch', 3.2, regras([
    ['email', "$json.origem === 'email'"],
    ['formulario', "$json.origem === 'formulario'"],
    ['varredura', "$json.origem === 'varredura'"],
  ]), [6, 1]);
  no('Buscar e-mails pendentes', 'n8n-nodes-base.gmail', 2.1, {
    authentication: 'oAuth2', resource: 'message', operation: 'getAll', returnAll: false, limit: 50, simple: false,
    filters: { q: `in:inbox newer_than:30d ${semEtiqueta}`, readStatus: 'both', receivedBefore: idadeMinima },
    options: { downloadAttachments: true, dataPropertyAttachmentsPrefixName: 'attachment_' },
  }, [7, 2], { credenciais: CREDENCIAIS.gmail, extras: { ...LEITURA, ...TENTATIVAS } });
  code('Padronizar e-mail pendente', 'padronizar-email.js', [8, 2]);
  code('Resolver empresa', 'resolver-empresa.js', [9, 1]);
  no('Um e-mail por vez', 'n8n-nodes-base.splitInBatches', 3, { batchSize: 1, options: {} }, [10, 1]);
  seNo('Envio pelo formulário?', "$json.origem === 'formulario'", [11, 0]);
  code('Mensagem ao formulário', 'mensagem-formulario.js', [12, 0]);
  no('Resposta ao formulário', 'n8n-nodes-base.form', 2.5, { operation: 'completion', respondWith: 'text', completionTitle: 'Envio processado', completionMessage: expr('$json.mensagem'), options: {} }, [13, 0]);

  // Sinal de vida
  seNo('É hora do sinal de vida?', "$json.origem === 'varredura' && $now.setZone('America/Sao_Paulo').hour === $json.config.sinal_de_vida_hora", [3, -1]);
  no('Contar e-mails pendentes', 'n8n-nodes-base.gmail', 2.1, {
    authentication: 'oAuth2', resource: 'message', operation: 'getAll', returnAll: false, limit: 100, simple: true,
    filters: { q: `in:inbox newer_than:30d ${semEtiqueta}`, readStatus: 'both', receivedBefore: idadeMinima }, options: {},
  }, [4, -1], { credenciais: CREDENCIAIS.gmail, extras: { ...LEITURA, ...SEGUE_COM_ERRO } });
  ler('Ler revisões abertas', 'Notas', [5, -1], { ...LEITURA, ...SEGUE_COM_ERRO }, { values: [{ lookupColumn: 'status', lookupValue: 'Revisão' }] });
  ler('Ler ocorrências recentes', 'Ocorrências', [6, -1], { ...LEITURA, ...SEGUE_COM_ERRO });
  code('Montar sinal de vida', 'montar-sinal-de-vida.js', [7, -1]);
  no('Enviar sinal de vida', 'n8n-nodes-base.emailSend', 2.1, emailSmtp(), [8, -1], { credenciais: CREDENCIAIS.smtp });

  // Pipeline de um pacote
  code('Triar anexos', 'triar-anexos.js', [11, 2]);
  ler('Ler aba Arquivos', 'Arquivos', [12, 2], { ...LEITURA, ...TENTATIVAS, ...SAIDA_DE_ERRO });
  ler('Ler aba Notas', 'Notas', [13, 2], { ...LEITURA, ...TENTATIVAS, ...SAIDA_DE_ERRO });
  code('Decidir por hashes', 'decidir-por-hashes.js', [14, 2]);
  no('Ação por hash', 'n8n-nodes-base.switch', 3.2, regras([['ler', "$json.acao === 'ler'"], ['sem_leitura', "$json.acao !== 'ler'"]]), [15, 2]);
  code('Plano sem leitura', 'plano-sem-leitura.js', [16, 4]);
  code('Ler XMLs e separar PDFs', 'ler-xmls-separar-pdfs.js', [16, 2]);
  seNo('Tem PDF?', '$json.pdf !== null', [17, 2]);
  no('Extrair texto do PDF', 'n8n-nodes-base.extractFromFile', 1.1, { operation: 'pdf', binaryPropertyName: 'data', options: { joinPages: true, keepSource: 'json' } }, [18, 2], { extras: SEGUE_COM_ERRO });
  code('Montar pedido à IA', 'montar-pedido-ia.js', [19, 2]);
  seNo('Precisa de IA?', '$json.precisa_ia === true', [20, 2]);
  no('Gemini · ler documentos', 'n8n-nodes-base.httpRequest', 4.2, {
    method: 'POST',
    url: expr("'https://generativelanguage.googleapis.com/v1beta/models/' + $json.modelo + ':generateContent'"),
    authentication: 'genericCredentialType', genericAuthType: 'httpHeaderAuth',
    sendBody: true, contentType: 'json', specifyBody: 'json', jsonBody: expr('JSON.stringify($json.pedido)'),
    options: { timeout: 120000 },
  }, [21, 2], { credenciais: CREDENCIAIS.gemini, extras: { ...TENTATIVAS, ...SAIDA_DE_ERRO } });
  code('Consolidar, validar e planejar', 'consolidar-validar-planejar.js', [22, 2], { extras: SAIDA_DE_ERRO });

  // Registro
  code('Plano de registro', 'plano-de-registro.js', [23, 3]);
  seNo('Tem arquivos?', '$json.arquivos.length > 0', [24, 3]);
  no('Buscar no Drive', 'n8n-nodes-base.googleDrive', 3, {
    authentication: 'oAuth2', resource: 'fileFolder', operation: 'search', searchMethod: 'query',
    queryString: expr('$json.consulta_drive'), returnAll: true, filter: {}, options: { fields: ['*'] },
  }, [25, 3], { credenciais: CREDENCIAIS.drive, extras: { ...LEITURA, ...TENTATIVAS, ...SAIDA_DE_ERRO } });
  code('Planejar pastas', 'planejar-pastas.js', [26, 3], { extras: SAIDA_DE_ERRO });
  seNo('Criar pastas?', '$json.criar === true', [27, 3]);
  no('Criar pasta do mês', 'n8n-nodes-base.googleDrive', 3, {
    authentication: 'oAuth2', resource: 'folder', operation: 'create', name: expr('$json.nome'),
    driveId: MEU_DRIVE, folderId: { __rl: true, mode: 'id', value: expr('$json.pai_id') }, options: {},
  }, [28, 3], { credenciais: CREDENCIAIS.drive, extras: { ...TENTATIVAS, ...SAIDA_DE_ERRO } });
  code('Arquivos a enviar', 'arquivos-a-enviar.js', [29, 3], { extras: SAIDA_DE_ERRO });
  seNo('Enviar?', '$json.enviar === true', [30, 3]);
  no('Enviar arquivo ao Drive', 'n8n-nodes-base.googleDrive', 3, {
    authentication: 'oAuth2', resource: 'file', operation: 'upload', name: expr('$json.nome'),
    driveId: MEU_DRIVE, folderId: { __rl: true, mode: 'id', value: expr('$json.pasta_id') }, inputDataFieldName: 'data', options: {},
  }, [31, 3], { credenciais: CREDENCIAIS.drive, extras: { ...TENTATIVAS, ...SAIDA_DE_ERRO } });
  code('Montar linhas', 'montar-linhas.js', [32, 3]);
  code('Preparar notas', 'preparar-linhas.js', [33, 3], {}, { __CAMPO__: 'notas' });
  seNo('Tem notas?', '$json._vazio !== true', [34, 3]);
  gravar('Gravar notas', 'Notas', 'appendOrUpdate', [35, 3], { ...TENTATIVAS, ...SAIDA_DE_ERRO }, 'chave_duplicidade');
  code('Preparar arquivos', 'preparar-linhas.js', [36, 3], { extras: SAIDA_DE_ERRO }, { __CAMPO__: 'arquivos' });
  seNo('Tem hashes?', '$json._vazio !== true', [37, 3]);
  gravar('Gravar arquivos', 'Arquivos', 'append', [38, 3], { ...TENTATIVAS, ...SAIDA_DE_ERRO });
  code('Preparar ocorrências', 'preparar-linhas.js', [39, 3], {}, { __CAMPO__: 'ocorrencias' });
  seNo('Tem ocorrências?', '$json._vazio !== true', [40, 3]);
  gravar('Gravar ocorrências', 'Ocorrências', 'append', [41, 3], { ...TENTATIVAS, ...SAIDA_DE_ERRO });
  code('Preparar etiqueta', 'preparar-etiqueta.js', [42, 3]);
  seNo('Tem etiqueta?', '$json._vazio !== true', [43, 3]);
  no('Aplicar etiqueta', 'n8n-nodes-base.gmail', 2.1, {
    authentication: 'oAuth2', resource: 'message', operation: 'addLabels', messageId: expr('$json.message_id'), labelIds: expr('[$json.etiqueta_id]'),
  }, [44, 3], { credenciais: CREDENCIAIS.gmail, extras: { ...TENTATIVAS, ...SAIDA_DE_ERRO } });
  code('Resultado do pacote', 'resultado-do-pacote.js', [45, 3]);

  // Falha técnica
  code('Falha técnica', 'falha-tecnica.js', [33, 6]);
  seNo('É e-mail?', 'Boolean($json.message_id)', [34, 6]);
  no('Etiquetar com NF/erro', 'n8n-nodes-base.gmail', 2.1, {
    authentication: 'oAuth2', resource: 'message', operation: 'addLabels', messageId: expr('$json.message_id'), labelIds: expr('[$json.etiqueta_erro_id]'),
  }, [35, 6], { credenciais: CREDENCIAIS.gmail, extras: SEGUE_COM_ERRO });
  code('Ocorrência de erro', 'ocorrencia-de-erro.js', [36, 6]);
  gravar('Gravar ocorrência de erro', 'Ocorrências', 'append', [37, 6], SEGUE_COM_ERRO);
  no('Alertar dono técnico', 'n8n-nodes-base.emailSend', 2.1, emailSmtp("$('Falha técnica').first().json"), [38, 6], { credenciais: CREDENCIAIS.smtp, extras: { executeOnce: true } });
  code('Resultado com falha', 'resultado-com-falha.js', [39, 6]);

  // Conexões: entrada
  ligar('Gmail · novos e-mails', 'Padronizar e-mail');
  ligar('Padronizar e-mail', 'Configuração');
  ligar('Formulário de notas', 'Padronizar formulário');
  ligar('Padronizar formulário', 'Configuração');
  ligar('Varredura horária', 'Marcar varredura');
  ligar('Marcar varredura', 'Configuração');
  ligar('Configuração', 'Listar etiquetas');
  ligar('Configuração', 'É hora do sinal de vida?');
  ligar('Listar etiquetas', 'Ler empresas');
  ligar('Ler empresas', 'Retomar entrada');
  ligar('Retomar entrada', 'Origem');
  ligar('Origem', 'Resolver empresa', 0);
  ligar('Origem', 'Resolver empresa', 1);
  ligar('Origem', 'Buscar e-mails pendentes', 2);
  ligar('Buscar e-mails pendentes', 'Padronizar e-mail pendente');
  ligar('Padronizar e-mail pendente', 'Resolver empresa');
  ligar('Resolver empresa', 'Um e-mail por vez');
  ligar('Um e-mail por vez', 'Envio pelo formulário?', 0);
  ligar('Um e-mail por vez', 'Triar anexos', 1);
  ligar('Envio pelo formulário?', 'Mensagem ao formulário', 0);
  ligar('Mensagem ao formulário', 'Resposta ao formulário');

  // Conexões: sinal de vida
  ligar('É hora do sinal de vida?', 'Contar e-mails pendentes', 0);
  ligar('Contar e-mails pendentes', 'Ler revisões abertas');
  ligar('Ler revisões abertas', 'Ler ocorrências recentes');
  ligar('Ler ocorrências recentes', 'Montar sinal de vida');
  ligar('Montar sinal de vida', 'Enviar sinal de vida');

  // Conexões: leitura
  ligar('Triar anexos', 'Ler aba Arquivos');
  ligar('Ler aba Arquivos', 'Ler aba Notas', 0);
  ligar('Ler aba Arquivos', 'Falha técnica', 1);
  ligar('Ler aba Notas', 'Decidir por hashes', 0);
  ligar('Ler aba Notas', 'Falha técnica', 1);
  ligar('Decidir por hashes', 'Ação por hash');
  ligar('Ação por hash', 'Ler XMLs e separar PDFs', 0);
  ligar('Ação por hash', 'Plano sem leitura', 1);
  ligar('Ler XMLs e separar PDFs', 'Tem PDF?');
  ligar('Tem PDF?', 'Extrair texto do PDF', 0);
  ligar('Tem PDF?', 'Montar pedido à IA', 1);
  ligar('Extrair texto do PDF', 'Montar pedido à IA');
  ligar('Montar pedido à IA', 'Precisa de IA?');
  ligar('Precisa de IA?', 'Gemini · ler documentos', 0);
  ligar('Precisa de IA?', 'Consolidar, validar e planejar', 1);
  ligar('Gemini · ler documentos', 'Consolidar, validar e planejar', 0);
  ligar('Gemini · ler documentos', 'Falha técnica', 1);
  ligar('Consolidar, validar e planejar', 'Plano de registro', 0);
  ligar('Consolidar, validar e planejar', 'Falha técnica', 1);
  ligar('Plano sem leitura', 'Plano de registro');

  // Conexões: registro
  ligar('Plano de registro', 'Tem arquivos?');
  ligar('Tem arquivos?', 'Buscar no Drive', 0);
  ligar('Tem arquivos?', 'Montar linhas', 1);
  ligar('Buscar no Drive', 'Planejar pastas', 0);
  ligar('Buscar no Drive', 'Falha técnica', 1);
  ligar('Planejar pastas', 'Criar pastas?', 0);
  ligar('Planejar pastas', 'Falha técnica', 1);
  ligar('Criar pastas?', 'Criar pasta do mês', 0);
  ligar('Criar pastas?', 'Arquivos a enviar', 1);
  ligar('Criar pasta do mês', 'Arquivos a enviar', 0);
  ligar('Criar pasta do mês', 'Falha técnica', 1);
  ligar('Arquivos a enviar', 'Enviar?', 0);
  ligar('Arquivos a enviar', 'Falha técnica', 1);
  ligar('Enviar?', 'Enviar arquivo ao Drive', 0);
  ligar('Enviar?', 'Montar linhas', 1);
  ligar('Enviar arquivo ao Drive', 'Montar linhas', 0);
  ligar('Enviar arquivo ao Drive', 'Falha técnica', 1);
  ligar('Montar linhas', 'Preparar notas');
  ligar('Preparar notas', 'Tem notas?');
  ligar('Tem notas?', 'Gravar notas', 0);
  ligar('Tem notas?', 'Preparar arquivos', 1);
  ligar('Gravar notas', 'Preparar arquivos', 0);
  ligar('Gravar notas', 'Falha técnica', 1);
  ligar('Preparar arquivos', 'Tem hashes?', 0);
  ligar('Preparar arquivos', 'Falha técnica', 1);
  ligar('Tem hashes?', 'Gravar arquivos', 0);
  ligar('Tem hashes?', 'Preparar ocorrências', 1);
  ligar('Gravar arquivos', 'Preparar ocorrências', 0);
  ligar('Gravar arquivos', 'Falha técnica', 1);
  ligar('Preparar ocorrências', 'Tem ocorrências?');
  ligar('Tem ocorrências?', 'Gravar ocorrências', 0);
  ligar('Tem ocorrências?', 'Preparar etiqueta', 1);
  ligar('Gravar ocorrências', 'Preparar etiqueta', 0);
  ligar('Gravar ocorrências', 'Falha técnica', 1);
  ligar('Preparar etiqueta', 'Tem etiqueta?');
  ligar('Tem etiqueta?', 'Aplicar etiqueta', 0);
  ligar('Tem etiqueta?', 'Resultado do pacote', 1);
  ligar('Aplicar etiqueta', 'Resultado do pacote', 0);
  ligar('Aplicar etiqueta', 'Falha técnica', 1);
  ligar('Resultado do pacote', 'Um e-mail por vez');

  // Conexões: falha técnica
  ligar('Falha técnica', 'É e-mail?');
  ligar('É e-mail?', 'Etiquetar com NF/erro', 0);
  ligar('É e-mail?', 'Ocorrência de erro', 1);
  ligar('Etiquetar com NF/erro', 'Ocorrência de erro');
  ligar('Ocorrência de erro', 'Gravar ocorrência de erro');
  ligar('Gravar ocorrência de erro', 'Alertar dono técnico');
  ligar('Alertar dono técnico', 'Resultado com falha');
  ligar('Resultado com falha', 'Um e-mail por vez');

  return wf;
}
