// @libs registro drive alertas datas
const plano = $('Plano de registro').first().json;
const config = $('Configuração').first().json.config;
const links = {};
if (plano.arquivos.length) {
  const envios = $('Arquivos a enviar').all().map((item) => item.json);
  Object.assign(links, envios[0]?.links ?? {});
  const enviados = envios.filter((envio) => envio.enviar);
  if (enviados.length) {
    const respostas = $('Enviar arquivo ao Drive').all();
    enviados.forEach((envio, indice) => {
      links[envio.anexo_chave] = linkDoArquivoDrive(respostas[indice].json.id);
    });
  }
}
const linhas = montarLinhas(plano, links, {
  agora: dataHoraSaoPaulo(),
  linkExecucao: linkDaExecucao(config.n8n_url, $workflow.id, $execution.id),
});
return [{ json: { ...linhas, origem: plano.origem, origem_id: plano.origem_id, message_id: plano.message_id, etiqueta: plano.etiqueta, resultado: plano.resultado } }];
