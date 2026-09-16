const TOLERANCIA_CENTAVOS = 0.005;
const MODELOS_NFE = new Set(['55', '65']);

// A chave da NF-e tem 44 dígitos e a da NFS-e nacional, 50. Só o tamanho não basta:
// a leitura de um documento escaneado pode devolver uma chave de NFS-e truncada.
// Numa NF-e de verdade as posições 21 e 22 são o modelo (55 ou 65).
function ehChaveNfe(chave) {
  const texto = String(chave ?? '');
  return /^\d{44}$/.test(texto) && MODELOS_NFE.has(texto.slice(20, 22));
}

function valorDeReferencia(nota) {
  return nota.valor_liquido ?? nota.valor_servico ?? null;
}

function consolidar(pacote, leituraIa, modelo) {
  const documentos = leituraIa?.documentos ?? [];
  const vencimentoCorpo = leituraIa?.vencimento_corpo_email ?? { data: null, trecho: null };
  const chaveDoArquivo = (documento) => (documento.arquivo ? pacote.arquivos_ia[documento.arquivo - 1] ?? null : null);
  const notas = pacote.notas_xml.map((nota) => ({ ...nota, arquivos_ligados: [{ chave: nota.arquivo_chave, tipo: 'xml' }] }));
  const documentosRevisao = [...pacote.documentos_revisao];
  const boletos = [];

  for (const documento of documentos) {
    const tipo = documento.tipo === 'nfse' && ehChaveNfe(documento.chave_acesso) ? 'nfe' : documento.tipo;
    const arquivoChave = chaveDoArquivo(documento);
    if (tipo === 'nfse') {
      const repetida = documento.chave_acesso ? notas.find((nota) => nota.chave_acesso === documento.chave_acesso) : null;
      if (repetida) {
        if (arquivoChave) repetida.arquivos_ligados.push({ chave: arquivoChave, tipo: 'nota' });
        continue;
      }
      const { arquivo, valor_documento, ...campos } = documento;
      notas.push({ ...campos, tipo: 'nfse', lido_por: `IA (${modelo})`, arquivo_chave: arquivoChave, arquivos_ligados: arquivoChave ? [{ chave: arquivoChave, tipo: 'nota' }] : [] });
    } else if (tipo === 'nfe') {
      documentosRevisao.push({ codigo: 'NFE_PRODUTO', arquivo_chave: arquivoChave });
    } else if (tipo === 'boleto') {
      boletos.push({ ...documento, arquivo_chave: arquivoChave });
    }
  }

  for (const [chavePdf, chaveAcesso] of Object.entries(pacote.representacoes ?? {})) {
    const nota = notas.find((item) => item.chave_acesso === chaveAcesso);
    if (nota) nota.arquivos_ligados.push({ chave: chavePdf, tipo: 'nota' });
  }

  const boletoDaNota = new Map();
  if (notas.length === 1 && boletos.length) {
    boletoDaNota.set(0, boletos.find((boleto) => boleto.vencimento) ?? boletos[0]);
  } else if (notas.length > 1) {
    for (const boleto of boletos) {
      if (boleto.valor_documento === null) continue;
      const iguais = notas
        .map((nota, indice) => ({ nota, indice }))
        .filter(({ nota }) => valorDeReferencia(nota) !== null && Math.abs(valorDeReferencia(nota) - boleto.valor_documento) < TOLERANCIA_CENTAVOS);
      if (iguais.length === 1 && !boletoDaNota.has(iguais[0].indice)) boletoDaNota.set(iguais[0].indice, boleto);
    }
  }

  notas.forEach((nota, indice) => {
    const boleto = boletoDaNota.get(indice);
    if (boleto?.arquivo_chave) nota.arquivos_ligados.push({ chave: boleto.arquivo_chave, tipo: 'boleto' });
    let vencimento = null;
    let fonte = '';
    let trecho = null;
    if (pacote.vencimento_informado) {
      vencimento = pacote.vencimento_informado;
      fonte = 'Formulário';
    } else if (boleto?.vencimento) {
      vencimento = boleto.vencimento;
      fonte = 'Boleto';
      trecho = boleto.vencimento_trecho;
    } else if (vencimentoCorpo.data) {
      vencimento = vencimentoCorpo.data;
      fonte = 'Corpo do e-mail';
      trecho = vencimentoCorpo.trecho;
    } else if (nota.vencimento) {
      vencimento = nota.vencimento;
      fonte = 'Nota';
      trecho = nota.vencimento_trecho;
    }
    Object.assign(nota, { vencimento, vencimento_fonte: fonte, vencimento_trecho: trecho, observacoes: vencimento ? [] : ['SEM_VENCIMENTO'] });
  });

  const motivosArquivo = [...pacote.motivos_arquivo];
  const ligados = new Set(notas.flatMap((nota) => nota.arquivos_ligados.map((arquivo) => arquivo.chave)));
  const daRevisao = new Set(documentosRevisao.map((documento) => documento.arquivo_chave).filter(Boolean));
  const soltos = pacote.anexos.filter((anexo) => !ligados.has(anexo.chave) && !daRevisao.has(anexo.chave));
  if (!notas.length && !documentosRevisao.length && pacote.arquivos_ia.length) motivosArquivo.push('NOTA_NAO_ENCONTRADA');

  const motivosLinha = documentosRevisao.map((documento) => documento.codigo);
  if (!notas.length) motivosLinha.push(...motivosArquivo);
  if (!notas.length && !motivosLinha.length) motivosLinha.push('NOTA_NAO_ENCONTRADA');

  let linhaPropria = null;
  if (motivosLinha.length) {
    const arquivos = [...daRevisao].map((chave) => ({ chave, tipo: 'anexo' }));
    if (!notas.length) arquivos.push(...soltos.map((anexo) => ({ chave: anexo.chave, tipo: 'anexo' })));
    linhaPropria = { motivos: [...new Set([...pacote.motivos_pacote, ...motivosLinha])], arquivos_ligados: arquivos };
  }

  if (notas.length) {
    const chavesDeBoleto = new Set(boletos.map((boleto) => boleto.arquivo_chave));
    notas[0].arquivos_ligados.push(...soltos.map((anexo) => ({ chave: anexo.chave, tipo: chavesDeBoleto.has(anexo.chave) ? 'boleto' : 'anexo' })));
    for (const nota of notas) nota.observacoes = [...new Set([...nota.observacoes, ...motivosArquivo])];
  }

  return { notas, linha_propria: linhaPropria };
}

module.exports = { consolidar, ehChaveNfe }; // @node-only
