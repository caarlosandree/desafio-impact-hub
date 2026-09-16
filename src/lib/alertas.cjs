const { truncar } = require('./texto.cjs'); // @node-only
const { dataHoraSaoPaulo } = require('./datas.cjs'); // @node-only
const { linhasValidas } = require('./linhas.cjs'); // @node-only

function linkDaExecucao(baseUrl, workflowId, execucaoId) {
  return `${String(baseUrl).replace(/\/+$/, '')}/workflow/${workflowId}/executions/${execucaoId}`;
}

function mensagemDoErro(erro) {
  if (!erro) return 'Erro desconhecido';
  if (typeof erro === 'string') return erro;
  return String(erro.message ?? erro.description ?? JSON.stringify(erro));
}

function ocorrenciaErroTecnico({ agora, origemId, no, mensagem, link }) {
  return {
    data_hora: agora, tipo: 'ERRO_TECNICO', origem_id: origemId ?? '', nota_id: '',
    descricao: truncar(`Falha no node "${no}": ${mensagem}`, 300), link_execucao: link,
  };
}

function alertaErroTecnico({ origem, origemId, no, mensagem, link }) {
  const comoReprocessar = origem === 'formulario'
    ? 'A pessoa que usou o formulário foi orientada a enviar de novo os mesmos arquivos depois.'
    : 'O e-mail recebeu a etiqueta NF/erro. Depois de corrigir a causa, tire a etiqueta NF/erro do e-mail para reprocessar.';
  return {
    assunto: `[NF] Erro técnico em "${no}"`,
    texto: [
      'O fluxo de notas fiscais não conseguiu processar um envio.',
      '',
      `Origem: ${origem === 'formulario' ? 'formulário' : 'e-mail'} (${origemId})`,
      `Node: ${no}`,
      `Mensagem técnica: ${truncar(mensagem, 500)}`,
      `Execução: ${link}`,
      '',
      comoReprocessar,
    ].join('\n'),
  };
}

function contarErrosRecentes(linhasOcorrencias, agora) {
  const limite = dataHoraSaoPaulo(new Date(agora.getTime() - 24 * 60 * 60 * 1000));
  return linhasValidas(linhasOcorrencias).filter((linha) => linha.tipo === 'ERRO_TECNICO' && String(linha.data_hora) >= limite).length;
}

function textoSinalDeVida({ agora, pendentes, revisoes, errosTecnicos, falhas }) {
  const valor = (numero) => (numero === null || numero === undefined ? 'não foi possível ler' : String(numero));
  const linhas = [
    `Sinal de vida do fluxo de notas fiscais — ${dataHoraSaoPaulo(agora)}`,
    '',
    `E-mails pendentes encontrados pela varredura: ${valor(pendentes)}`,
    `Notas em revisão: ${valor(revisoes)}`,
    `Erros técnicos nas últimas 24 horas: ${valor(errosTecnicos)}`,
  ];
  if (falhas.length) linhas.push('', `Atenção: não foi possível ler ${falhas.join(' e ')}. Verifique as credenciais do Google no n8n.`);
  linhas.push('', 'Se este e-mail não chegar num dia útil, o n8n está parado.');
  return { assunto: falhas.length ? '[NF] Sinal de vida com falhas' : '[NF] Sinal de vida', texto: linhas.join('\n') };
}

function alertaErrorWorkflow(dados) {
  const execucao = dados?.execution ?? {};
  const fluxo = dados?.workflow ?? {};
  return {
    assunto: `[NF] Falha inesperada no workflow "${fluxo.name ?? 'desconhecido'}"`,
    texto: [
      'O workflow parou por um erro que não foi tratado dentro dele.',
      '',
      `Workflow: ${fluxo.name ?? '-'}`,
      `Último node executado: ${execucao.lastNodeExecuted ?? '-'}`,
      `Mensagem técnica: ${truncar(mensagemDoErro(execucao.error ?? dados?.trigger?.error), 500)}`,
      `Execução: ${execucao.url ?? '-'}`,
      '',
      'E-mails sem etiqueta serão processados pela varredura horária depois que a causa for corrigida.',
    ].join('\n'),
  };
}

function mensagemFormulario(resumos) {
  const linhas = [];
  for (const resumo of resumos) {
    if (resumo.falha) {
      linhas.push('Não foi possível concluir o envio por uma falha técnica. O dono técnico já foi avisado.');
      linhas.push('Tente mais tarde: envie de novo os mesmos arquivos; nada será duplicado.');
      continue;
    }
    for (const item of resumo.resultado) {
      const nome = item.numero ? `Nota ${item.numero}` : 'Envio sem nota identificada';
      if (item.situacao === 'duplicata') linhas.push(`${nome}: já registrada antes (id ${item.id}); não foi gravada de novo.`);
      else if (item.situacao === 'ja_registrada') linhas.push(`${nome}: já estava registrada (status ${item.status}).`);
      else if (item.status === 'Revisão') linhas.push(`${nome}: ${item.numero ? 'registrada' : 'registrado'} em Revisão. ${item.motivos.replace(/\n/g, ' ')}`);
      else linhas.push(`${nome}: registrada como Extraída.`);
    }
  }
  return linhas.length ? linhas.join('\n') : 'Nenhuma nota foi identificada no envio.';
}

module.exports = { linkDaExecucao, mensagemDoErro, ocorrenciaErroTecnico, alertaErroTecnico, contarErrosRecentes, textoSinalDeVida, alertaErrorWorkflow, mensagemFormulario }; // @node-only
