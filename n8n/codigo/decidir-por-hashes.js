// @libs triagem
const pacote = $('Triar anexos').first().json;
const decisao = decidirPorHashes(
  pacote,
  $('Ler aba Arquivos').all().map((item) => item.json),
  $('Ler aba Notas').all().map((item) => item.json),
);
return [{ json: { ...decisao, anexos: decisao.anexos.map(({ base64, ...anexo }) => anexo) } }];
