import { Workflow, IDS, CREDENCIAIS, codigo, emailSmtp } from '../construtor.mjs';

export function definirErros(config) {
  const { emails_alerta, remetente_alertas } = config.configuracao;
  const wf = new Workflow({
    id: IDS.erros,
    nome: 'NF · Erros',
    configuracoes: { executionOrder: 'v1', timezone: 'America/Sao_Paulo', saveManualExecutions: false, callerPolicy: 'workflowsFromSameOwner', binaryMode: 'separate' },
  });
  wf.no('Erro em workflow de NF', 'n8n-nodes-base.errorTrigger', 1, {}, { posicao: [0, 0] });
  wf.no('Montar alerta', 'n8n-nodes-base.code', 2, codigo('montar-alerta-erro.js', { __CONFIG__: JSON.stringify({ emails_alerta, remetente_alertas }, null, 2) }), { posicao: [1, 0] });
  wf.no('Enviar alerta', 'n8n-nodes-base.emailSend', 2.1, emailSmtp(), { posicao: [2, 0], credenciais: CREDENCIAIS.smtp });
  wf.ligar('Erro em workflow de NF', 'Montar alerta');
  wf.ligar('Montar alerta', 'Enviar alerta');
  return wf;
}
