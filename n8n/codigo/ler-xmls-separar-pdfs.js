// @libs leitura
const conteudos = Object.fromEntries($('Triar anexos').first().json.anexos.map((anexo) => [anexo.chave, anexo.base64]));
const pacote = lerXmlsDoPacote($input.first().json, (chave) => Buffer.from(conteudos[chave], 'base64').toString('utf8'));
const pdfs = pacote.anexos.filter((anexo) => anexo.tipo === 'pdf');
if (!pdfs.length) return [{ json: { pacote, pdf: null } }];
const saida = [];
for (const pdf of pdfs) {
  const binario = await this.helpers.prepareBinaryData(Buffer.from(conteudos[pdf.chave], 'base64'), 'documento.pdf', 'application/pdf');
  saida.push({ json: { pacote, pdf: pdf.chave }, binary: { data: binario } });
}
return saida;
