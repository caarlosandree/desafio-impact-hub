// @libs entrada
const crypto = require('crypto');
const itens = $input.all();
const saida = [];
for (let indice = 0; indice < itens.length; indice++) {
  const item = itens[indice];
  if (!item.json.id) continue;
  const anexos = [];
  for (const [chave, binario] of Object.entries(item.binary ?? {})) {
    const buffer = await this.helpers.getBinaryDataBuffer(indice, chave);
    anexos.push({
      chave, nome: binario.fileName ?? chave, mime: binario.mimeType ?? '', tamanho_bytes: buffer.length,
      hash: crypto.createHash('sha256').update(buffer).digest('hex'), base64: buffer.toString('base64'),
    });
  }
  saida.push({ json: padronizarEmail(item.json, anexos) });
}
return saida;
