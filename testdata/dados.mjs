import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { calcularDvCnpj } = require('../src/lib/cnpj.cjs');
const { dataSaoPaulo } = require('../src/lib/datas.cjs');

export const MARCA = 'DOCUMENTO FICTÍCIO — SEM VALOR FISCAL';
export const EMAIL_TESTE = process.env.GMAIL_TESTE || 'desafioimphub@gmail.com';
export const alias = (sufixo) => EMAIL_TESTE.replace('@', `+${sufixo}@`);
export const cnpjCompleto = (base) => `${base}${calcularDvCnpj(base)}`;

export const EMPRESAS = {
  colmeia: { apelido: 'Colmeia', razao: 'Colmeia Espaços Colaborativos Ltda.', cnpj: cnpjCompleto('472918360001'), email: alias('colmeia') },
  trampolim: { apelido: 'Trampolim', razao: 'Trampolim Inclusão Produtiva Ltda.', cnpj: cnpjCompleto('947162030001'), email: alias('trampolim') },
  mare: { apelido: 'Maré', razao: 'Maré Eventos de Impacto Ltda.', cnpj: cnpjCompleto('691837250001'), email: alias('mare') },
};

export const FORNECEDORES = {
  atelie: { nome: 'Ateliê Bromélia Design Ltda.', cnpj: cnpjCompleto('873904510001'), servico: 'Criação de identidade visual do programa de aceleração' },
  marina: { nome: '92640187 Marina Duarte Lopes', cnpj: cnpjCompleto('926401870001'), servico: 'Facilitação de oficina de empregabilidade' },
  faxina: { nome: 'Faxina Cuidadosa Serviços Ltda.', cnpj: cnpjCompleto('961830420001'), servico: 'Limpeza e conservação da unidade Centro' },
  nuvem: { nome: 'Nuvem Clara Tecnologia Ltda.', cnpj: cnpjCompleto('7Q2K9M4P0001'), servico: 'Suporte e manutenção de sistemas' },
  somluz: { nome: 'Som e Luz Eventos Ltda.', cnpj: cnpjCompleto('704516380001'), servico: 'Sonorização e iluminação do evento Maré de Ideias' },
  rafael: { nome: 'Rafael Tavares Nogueira', cpf: '38419205700', servico: 'Cobertura fotográfica do evento' },
  papelaria: { nome: 'Papelaria Ponto Final Ltda.', cnpj: cnpjCompleto('815620930001'), servico: 'Material de escritório' },
};

export function trocarDv(cnpj) {
  const dv = cnpj.slice(12);
  const trocado = dv[0] === dv[1] ? `${dv[0]}${(Number(dv[1]) + 1) % 10}` : `${dv[1]}${dv[0]}`;
  return `${cnpj.slice(0, 12)}${trocado}`;
}

export const HOJE = dataSaoPaulo();

export function diasAPartirDeHoje(dias) {
  const data = new Date(`${HOJE}T12:00:00Z`);
  data.setUTCDate(data.getUTCDate() + dias);
  return data.toISOString().slice(0, 10);
}

export const paraBr = (iso) => iso.split('-').reverse().join('/');
export const moeda = (valor) => valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
