// @libs drive
const plano = $('Plano de registro').first().json;
const planoPastas = $('Planejar pastas').first().json;
const pastasMes = { ...planoPastas.pastas_mes };
if (planoPastas.pastas_criar.length) {
  $('Criar pasta do mês').all().forEach((item, indice) => {
    pastasMes[planoPastas.pastas_criar[indice].caminho] = item.json.id;
  });
}
const { enviar, links } = separarEnvios(plano, $('Buscar no Drive').all().map((item) => item.json), pastasMes);
if (!enviar.length) return [{ json: { enviar: false, links } }];
const conteudos = Object.fromEntries($('Triar anexos').first().json.anexos.map((anexo) => [anexo.chave, anexo.base64]));
const saida = [];
for (const arquivo of enviar) {
  const binario = await this.helpers.prepareBinaryData(Buffer.from(conteudos[arquivo.anexo_chave], 'base64'), arquivo.nome, arquivo.mime);
  saida.push({ json: { ...arquivo, enviar: true, links }, binary: { data: binario } });
}
return saida;
