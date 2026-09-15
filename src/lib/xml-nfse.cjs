const { somenteAlfanumericos, truncar } = require('./texto.cjs'); // @node-only
const { normalizarData } = require('./datas.cjs'); // @node-only
const { lerXml, filhoXml, caminhoXml, textoXml } = require('./xml.cjs'); // @node-only

const NS_NFSE = 'http://www.sped.fazenda.gov.br/nfse';

function numeroDoXml(valor) {
  if (valor === null) return null;
  const numero = Number(String(valor).replace(',', '.'));
  return Number.isFinite(numero) ? numero : null;
}

function chaveSemPrefixo(valor) {
  return somenteAlfanumericos(valor).replace(/^NFS/, '') || null;
}

function lerXmlNfse(texto) {
  let raiz;
  try {
    raiz = lerXml(texto);
  } catch (erro) {
    return { tipo: 'desconhecido' };
  }
  if (raiz.ns === NS_NFSE && raiz.nome === 'evento') return { tipo: 'evento' };
  if (raiz.ns !== NS_NFSE || raiz.nome !== 'NFSe') return { tipo: 'desconhecido' };
  const inf = filhoXml(raiz, 'infNFSe');
  if (!inf) return { tipo: 'desconhecido' };
  const dps = caminhoXml(inf, 'DPS/infDPS');
  return {
    tipo: 'nfse',
    nota: {
      tipo: 'nfse',
      numero: textoXml(inf, 'nNFSe'),
      chave_acesso: chaveSemPrefixo(inf.atributos.Id),
      data_emissao: normalizarData(textoXml(inf, 'dhProc')),
      competencia: normalizarData(textoXml(dps, 'dCompet')),
      prestador_documento: somenteAlfanumericos(textoXml(inf, 'emit/CNPJ') ?? textoXml(inf, 'emit/CPF')) || null,
      prestador_nome: textoXml(inf, 'emit/xNome'),
      tomador_cnpj: somenteAlfanumericos(textoXml(dps, 'toma/CNPJ')) || null,
      tomador_nome: textoXml(dps, 'toma/xNome'),
      descricao_servico: truncar(textoXml(dps, 'serv/cServ/xDescServ'), 200),
      valor_servico: numeroDoXml(textoXml(dps, 'valores/vServPrest/vServ')),
      retencoes_total: numeroDoXml(textoXml(inf, 'valores/vTotalRet')),
      valor_liquido: numeroDoXml(textoXml(inf, 'valores/vLiq')),
      chave_nota_substituida: chaveSemPrefixo(textoXml(dps, 'subst/chSubstda')),
      vencimento: null,
      vencimento_trecho: null,
    },
  };
}

module.exports = { NS_NFSE, lerXmlNfse, chaveSemPrefixo }; // @node-only
