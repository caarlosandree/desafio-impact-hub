import { EMPRESAS, FORNECEDORES, diasAPartirDeHoje, trocarDv } from './dados.mjs';

const BASE = {
  n1201: { numero: '1201', prestador: 'atelie', tomador: 'colmeia', emissaoDias: -5, valorServico: 1500 },
  n87: { numero: '87', prestador: 'marina', tomador: 'trampolim', emissaoDias: -3, valorServico: 1200 },
  n455: { numero: '455', prestador: 'somluz', tomador: 'mare', emissaoDias: -4, valorServico: 4800, retencoes: 240 },
  n3310: { numero: '3310', prestador: 'faxina', tomador: 'colmeia', emissaoDias: -2, valorServico: 2350 },
  n1202: { numero: '1202', prestador: 'atelie', tomador: 'trampolim', emissaoDias: -2, valorServico: 890 },
  n3311: { numero: '3311', prestador: 'faxina', tomador: 'trampolim', emissaoDias: -2, valorServico: 640, cnpjInvalido: true },
  n19: { numero: '19', prestador: 'rafael', tomador: 'mare', emissaoDias: -6, valorServico: 750 },
  n1250: { numero: '1250', prestador: 'atelie', tomador: 'colmeia', emissaoDias: -1, valorServico: 1450, substitui: 'n1201' },
  n501: { numero: '501', prestador: 'nuvem', tomador: 'colmeia', emissaoDias: -4, valorServico: 800 },
  n502: { numero: '502', prestador: 'nuvem', tomador: 'colmeia', emissaoDias: -4, valorServico: 1200 },
  n87b: { numero: '87', prestador: 'faxina', tomador: 'trampolim', emissaoDias: -3, valorServico: 990 },
  n777: { numero: '777', prestador: 'nuvem', tomador: 'mare', emissaoDias: -7, valorServico: 3100 },
  n460: { numero: '460', prestador: 'somluz', tomador: 'colmeia', emissaoDias: -5, valorServico: 700 },
  n470: { numero: '470', prestador: 'somluz', tomador: 'mare', emissaoDias: -2, valorServico: 5200, retencoes: 260 },
  n90: { numero: '90', prestador: 'marina', tomador: 'colmeia', emissaoDias: -1, valorServico: 600 },
  n3400: { numero: '3400', prestador: 'faxina', tomador: 'trampolim', emissaoDias: -1, valorServico: 1850 },
  n1300: { numero: '1300', prestador: 'atelie', tomador: 'colmeia', emissaoDias: -3, valorServico: 980 },
  n610: { numero: '610', prestador: 'nuvem', tomador: 'trampolim', emissaoDias: -2, valorServico: 950 },
  n611: { numero: '611', prestador: 'nuvem', tomador: 'trampolim', emissaoDias: -2, valorServico: 950 },
  n1310: { numero: '1310', prestador: 'atelie', tomador: 'colmeia', emissaoDias: -2, valorServico: 1100 },
  n480: { numero: '480', prestador: 'somluz', tomador: 'mare', emissaoDias: -1, valorServico: 900 },
  n1320: { numero: '1320', prestador: 'atelie', tomador: 'colmeia', emissaoDias: -1, valorServico: 2100 },
  n5501: { numero: '5501', prestador: 'faxina', tomador: 'mare', emissaoDias: -3, valorServico: 420 },
};

export function chaveNfse({ documento, numero, emissao }) {
  const tipoInscricao = documento.length === 11 ? '1' : '2';
  const inscricao = documento.length === 11 ? `000${documento}` : documento;
  const aamm = `${emissao.slice(2, 4)}${emissao.slice(5, 7)}`;
  return `3550308${'1'}${tipoInscricao}${inscricao}${numero.padStart(13, '0')}${aamm}${numero.padStart(9, '7')}5`;
}

export function montarNota(id) {
  const base = BASE[id];
  if (!base) throw new Error(`Nota de teste desconhecida: ${id}`);
  const fornecedor = FORNECEDORES[base.prestador];
  const empresa = EMPRESAS[base.tomador];
  const emissao = diasAPartirDeHoje(base.emissaoDias);
  const documentoReal = fornecedor.cpf ?? fornecedor.cnpj;
  const documento = base.cnpjInvalido ? trocarDv(documentoReal) : documentoReal;
  const retencoes = base.retencoes ?? 0;
  return {
    id,
    numero: base.numero,
    chave: chaveNfse({ documento: documentoReal, numero: base.numero, emissao }),
    emissao,
    competencia: `${emissao.slice(0, 7)}-01`,
    prestador: { documento, nome: fornecedor.nome },
    tomador: { cnpj: empresa.cnpj, nome: empresa.razao },
    descricao: fornecedor.servico,
    valorServico: base.valorServico,
    retencoes,
    valorLiquido: base.valorServico - retencoes,
    substituida: base.substitui ? montarNota(base.substitui).chave : null,
  };
}

export const BOLETOS = {
  b1201: { nota: 'n1201', vencimento: diasAPartirDeHoje(10) },
  b502: { nota: 'n502', vencimento: diasAPartirDeHoje(12) },
  b460: { nota: 'n460', vencimento: diasAPartirDeHoje(-8) },
  b610: { nota: 'n610', vencimento: diasAPartirDeHoje(8) },
};
