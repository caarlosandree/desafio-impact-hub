// @libs leitura gemini
const origem = $('Ler XMLs e separar PDFs').all();
const pacote = origem[0].json.pacote;
const leituras = $input.all()
  .map((item, indice) => ({ item, chave: origem[indice]?.json.pdf ?? null }))
  .filter(({ chave }) => chave)
  .map(({ item, chave }) => ({ chave, texto: item.json.text ?? '', erro: item.json.error ?? null }));
const avaliado = avaliarPdfs(pacote, leituras);
const config = $('Configuração').first().json.config;
if (!avaliado.precisa_ia) return [{ json: { pacote: avaliado, precisa_ia: false, modelo: config.modelo_gemini } }];
const conteudos = Object.fromEntries($('Triar anexos').first().json.anexos.map((anexo) => [anexo.chave, anexo.base64]));
return [{ json: { pacote: avaliado, precisa_ia: true, modelo: config.modelo_gemini, pedido: montarPedidoGemini(avaliado, (chave) => conteudos[chave]) } }];
