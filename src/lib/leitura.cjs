const { somenteAlfanumericos } = require('./texto.cjs'); // @node-only
const { lerXmlNfse } = require('./xml-nfse.cjs'); // @node-only

function lerXmlsDoPacote(pacote, lerTexto) {
  const notas_xml = [];
  const documentos_revisao = [];
  let xmlNaoReconhecido = false;
  for (const anexo of pacote.anexos.filter((item) => item.tipo === 'xml')) {
    const leitura = lerXmlNfse(lerTexto(anexo.chave));
    if (leitura.tipo === 'nfse') {
      const repetida = notas_xml.some((nota) => nota.chave_acesso && nota.chave_acesso === leitura.nota.chave_acesso);
      if (!repetida) notas_xml.push({ ...leitura.nota, lido_por: 'XML', arquivo_chave: anexo.chave });
    } else if (leitura.tipo === 'evento') {
      documentos_revisao.push({ codigo: 'EVENTO_NFSE', arquivo_chave: anexo.chave });
    } else {
      xmlNaoReconhecido = true;
    }
  }
  const temPdfOuImagem = pacote.anexos.some((anexo) => anexo.tipo === 'pdf' || anexo.tipo === 'imagem');
  const motivos_arquivo = [...pacote.motivos_arquivo];
  if (xmlNaoReconhecido && !temPdfOuImagem) motivos_arquivo.push('XML_NAO_RECONHECIDO');
  return { ...pacote, notas_xml, documentos_revisao, motivos_arquivo };
}

function avaliarPdfs(pacote, leiturasPdf) {
  const ilegiveis = leiturasPdf.filter((leitura) => leitura.erro).map((leitura) => leitura.chave);
  const representacoes = {};
  for (const leitura of leiturasPdf.filter((item) => !item.erro)) {
    const texto = somenteAlfanumericos(leitura.texto);
    const nota = pacote.notas_xml.find((item) => item.chave_acesso && texto.includes(item.chave_acesso));
    if (nota) representacoes[leitura.chave] = nota.chave_acesso;
  }
  const motivos_arquivo = [...pacote.motivos_arquivo];
  if (ilegiveis.length) motivos_arquivo.push('ARQUIVO_ILEGIVEL');
  const arquivos_ia = pacote.anexos
    .filter((anexo) => (anexo.tipo === 'pdf' || anexo.tipo === 'imagem') && !ilegiveis.includes(anexo.chave) && !representacoes[anexo.chave])
    .map((anexo) => anexo.chave);
  const soPeloVencimento = !pacote.vencimento_informado && pacote.notas_xml.length > 0 && String(pacote.corpo_texto ?? '').trim() !== '';
  return { ...pacote, ilegiveis, representacoes, arquivos_ia, precisa_ia: arquivos_ia.length > 0 || soPeloVencimento, motivos_arquivo };
}

module.exports = { lerXmlsDoPacote, avaliarPdfs }; // @node-only
