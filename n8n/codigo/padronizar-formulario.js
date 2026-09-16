// @libs entrada
const crypto = require('crypto');
const sha256 = (dados) => crypto.createHash('sha256').update(dados).digest('hex');
const item = $input.first();
const anexos = [];
for (const [chave, binario] of Object.entries(item.binary ?? {})) {
  const buffer = await this.helpers.getBinaryDataBuffer(0, chave);
  anexos.push({ chave, nome: binario.fileName ?? chave, mime: binario.mimeType ?? '', tamanho_bytes: buffer.length, hash: sha256(buffer), base64: buffer.toString('base64') });
}
return [{ json: padronizarFormulario(item.json, anexos, sha256) }];
