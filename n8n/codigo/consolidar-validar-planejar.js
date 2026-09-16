// @libs gemini consolidacao registro datas
const crypto = require('crypto');
const sha256 = (texto) => crypto.createHash('sha256').update(texto).digest('hex');
const anterior = $('Montar pedido à IA').first().json;
const config = $('Configuração').first().json.config;
const leituraIa = anterior.precisa_ia ? interpretarRespostaGemini($input.first().json) : null;
const consolidado = consolidar(anterior.pacote, leituraIa, anterior.modelo);
const plano = planejarRegistro(anterior.pacote, consolidado, {
  sha256,
  config,
  hoje: dataSaoPaulo(),
  linhasNotas: $('Ler aba Notas').all().map((item) => item.json),
  linhasArquivos: $('Ler aba Arquivos').all().map((item) => item.json),
});
return [{ json: plano }];
