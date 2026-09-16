// @libs alertas datas
const config = $('Configuração').first().json.config;
const pacote = $('Triar anexos').first().json;
const entrada = $input.first().json;
const mensagem = mensagemDoErro(entrada.error ?? entrada.message ?? entrada);
const no = $prevNode.name;
const link = linkDaExecucao(config.n8n_url, $workflow.id, $execution.id);
return [{
  json: {
    origem: pacote.origem,
    origem_id: pacote.origem_id,
    message_id: pacote.message_id,
    etiqueta_erro_id: $('Retomar entrada').first().json.etiquetas_ids['NF/erro'],
    ocorrencia: ocorrenciaErroTecnico({ agora: dataHoraSaoPaulo(), origemId: pacote.origem_id, no, mensagem, link }),
    ...alertaErroTecnico({ origem: pacote.origem, origemId: pacote.origem_id, no, mensagem, link }),
    para: config.emails_alerta,
    de: config.remetente_alertas,
  },
}];
