const { somenteAlfanumericos } = require('./texto.cjs'); // @node-only
const { diasEntre } = require('./datas.cjs'); // @node-only
const { validarCnpj, ehCpf } = require('./cnpj.cjs'); // @node-only

const TEXTOS_DOS_MOTIVOS = {
  EMPRESA_DESCONHECIDA: () => 'E-mail enviado para um endereço que não está na aba Empresas.',
  SEM_ANEXO: () => 'E-mail sem anexo aproveitável; a nota pode estar num link de portal.',
  ARQUIVO_NAO_SUPORTADO: () => 'Anexo em formato não aceito (ex.: .zip).',
  ARQUIVO_ILEGIVEL: () => 'PDF que exige senha para abrir ou está corrompido.',
  XML_NAO_RECONHECIDO: () => 'XML fora do padrão nacional e sem PDF da nota.',
  NOTA_NAO_ENCONTRADA: () => 'Nenhuma nota fiscal encontrada nos anexos.',
  EVENTO_NFSE: () => 'XML de evento da NFS-e (ex.: cancelamento).',
  NFE_PRODUTO: () => 'NF-e de produto: fora deste fluxo.',
  CAMPO_FALTANDO: (p) => `Não foi possível ler: ${p.campos.join(', ')}.`,
  PRESTADOR_PESSOA_FISICA: () => 'Nota emitida por CPF, fora do padrão de fornecedor PJ.',
  CNPJ_INVALIDO: (p) => `CNPJ do ${p.parte} inválido.`,
  TOMADOR_DIVERGENTE: (p) => `Nota emitida para ${p.tomador}, não para a ${String(p.empresa).replace(/\.$/, '')}.`,
  VALOR_INCOERENTE: () => 'Valor zerado, negativo ou líquido maior que o bruto.',
  DATA_INCOERENTE: () => 'Data de emissão no futuro ou muito antiga.',
  VENCIMENTO_INCOERENTE: () => 'Vencimento antes da emissão ou distante demais.',
  NOTA_SUBSTITUTA: (p) => `Substitui a nota ${p.referencia}; confira se a original já foi aprovada ou paga.`,
};

const TEXTOS_DAS_OBSERVACOES = {
  SEM_VENCIMENTO: () => 'Sem vencimento: confira o boleto ou combine a data com o fornecedor.',
};

function textoDoCodigo(codigo, parametros = {}) {
  const gerador = TEXTOS_DOS_MOTIVOS[codigo] ?? TEXTOS_DAS_OBSERVACOES[codigo];
  return gerador ? gerador(parametros) : codigo;
}

function criarMotivo(codigo, parametros = {}) {
  return { codigo, texto: textoDoCodigo(codigo, parametros) };
}

function formatarMotivos(motivos) {
  return motivos.map((motivo) => `[${motivo.codigo}] ${motivo.texto}`).join('\n');
}

function formatarObservacoes(codigos) {
  return [...new Set(codigos)].map((codigo) => `[${codigo}] ${textoDoCodigo(codigo)}`).join('\n');
}

function juntarObservacao(existente, nova) {
  const atual = String(existente ?? '').trim();
  if (atual.split('\n').includes(nova)) return atual;
  return atual ? `${atual}\n${nova}` : nova;
}

function validarNota(nota, contexto) {
  const { empresa, motivosPacote = [], hoje, config, linhasNotas = [] } = contexto;
  const motivos = motivosPacote.map((codigo) => criarMotivo(codigo));

  const faltando = [];
  if (!nota.numero) faltando.push('número');
  if (!nota.prestador_documento) faltando.push('documento do prestador');
  if (!nota.tomador_cnpj) faltando.push('CNPJ do tomador');
  if (!nota.data_emissao) faltando.push('data de emissão');
  if (nota.valor_liquido === null && nota.valor_servico === null) faltando.push('valor');
  if (faltando.length) motivos.push(criarMotivo('CAMPO_FALTANDO', { campos: faltando }));

  if (ehCpf(nota.prestador_documento)) motivos.push(criarMotivo('PRESTADOR_PESSOA_FISICA'));
  else if (nota.prestador_documento && !validarCnpj(nota.prestador_documento)) motivos.push(criarMotivo('CNPJ_INVALIDO', { parte: 'prestador' }));

  const tomadorValido = Boolean(nota.tomador_cnpj) && validarCnpj(nota.tomador_cnpj);
  if (nota.tomador_cnpj && !tomadorValido) motivos.push(criarMotivo('CNPJ_INVALIDO', { parte: 'tomador' }));
  if (tomadorValido && empresa && !motivosPacote.includes('EMPRESA_DESCONHECIDA') && somenteAlfanumericos(nota.tomador_cnpj) !== empresa.cnpj) {
    motivos.push(criarMotivo('TOMADOR_DIVERGENTE', { tomador: nota.tomador_nome || somenteAlfanumericos(nota.tomador_cnpj), empresa: empresa.nome || empresa.apelido }));
  }

  const valores = [nota.valor_servico, nota.valor_liquido].filter((valor) => valor !== null && valor !== undefined);
  const liquidoMaior = nota.valor_servico !== null && nota.valor_liquido !== null && nota.valor_liquido > nota.valor_servico + 0.005;
  if (valores.some((valor) => valor <= 0) || liquidoMaior) motivos.push(criarMotivo('VALOR_INCOERENTE'));

  if (nota.data_emissao && (nota.data_emissao > hoje || diasEntre(nota.data_emissao, hoje) > config.emissao_max_dias)) {
    motivos.push(criarMotivo('DATA_INCOERENTE'));
  }
  if (nota.vencimento && nota.data_emissao && (nota.vencimento < nota.data_emissao || diasEntre(nota.data_emissao, nota.vencimento) > config.vencimento_max_dias)) {
    motivos.push(criarMotivo('VENCIMENTO_INCOERENTE'));
  }
  if (nota.chave_nota_substituida) {
    const original = linhasNotas.find((linha) => String(linha.chave_duplicidade) === nota.chave_nota_substituida);
    motivos.push(criarMotivo('NOTA_SUBSTITUTA', { referencia: original?.numero ? String(original.numero) : nota.chave_nota_substituida }));
  }
  return motivos;
}

module.exports = { textoDoCodigo, criarMotivo, formatarMotivos, formatarObservacoes, juntarObservacao, validarNota }; // @node-only
