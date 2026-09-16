import './env.mjs';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import ExcelJS from 'exceljs';
import { RAIZ_PROJETO } from './env.mjs';
import { EMPRESAS } from '../testdata/dados.mjs';

export const COLUNAS = {
  Notas: ['id', 'status', 'motivos', 'observacoes', 'empresa', 'prestador_nome', 'prestador_documento', 'numero', 'chave_acesso', 'emissao', 'competencia', 'descricao_servico', 'valor_servico', 'retencoes_total', 'valor_liquido', 'vencimento', 'vencimento_fonte', 'vencimento_trecho', 'lido_por', 'arquivos', 'origem', 'origem_id', 'enviado_por', 'recebido_em', 'chave_duplicidade', 'revisado_por', 'revisado_em', 'centro_custo', 'aprovador', 'enviado_aprovacao_em', 'decisao', 'decidido_por', 'decidido_em', 'motivo_reprovacao', 'pago_em'],
  Arquivos: ['hash_sha256', 'nota_id', 'nome_arquivo', 'origem_id', 'recebido_em', 'link'],
  'Ocorrências': ['data_hora', 'tipo', 'origem_id', 'nota_id', 'descricao', 'link_execucao'],
  Empresas: ['apelido', 'endereco_destino', 'empresa', 'cnpj'],
  Fornecedores: ['cnpj', 'nome', 'centro_custo_padrao', 'prazo_padrao_dias'],
  'Centros de custo': ['centro_custo', 'gestor', 'celular_gestor', 'substituto', 'celular_substituto'],
};
const COLUNAS_TEXTO = new Set(['id', 'prestador_documento', 'numero', 'chave_acesso', 'origem_id', 'chave_duplicidade', 'hash_sha256', 'nota_id', 'cnpj']);
const LARGURAS = { motivos: 60, observacoes: 45, arquivos: 50, descricao_servico: 40, vencimento_trecho: 40, descricao: 60, chave_acesso: 55, chave_duplicidade: 55, hash_sha256: 66, link: 50, link_execucao: 50 };

const livro = new ExcelJS.Workbook();
for (const [nomeAba, colunas] of Object.entries(COLUNAS)) {
  const aba = livro.addWorksheet(nomeAba, { views: [{ state: 'frozen', ySplit: 1 }] });
  aba.columns = colunas.map((coluna) => ({ header: coluna, key: coluna, width: LARGURAS[coluna] ?? Math.max(14, coluna.length + 4), style: COLUNAS_TEXTO.has(coluna) ? { numFmt: '@' } : {} }));
  aba.getRow(1).font = { bold: true };
  aba.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: colunas.length } };
}
const notas = livro.getWorksheet('Notas');
for (let linha = 2; linha <= 3000; linha++) {
  notas.getCell(linha, 2).dataValidation = { type: 'list', allowBlank: true, formulae: ['"Extraída,Revisão,Aguardando aprovação,Aprovada,Reprovada,Paga"'] };
}
const empresas = livro.getWorksheet('Empresas');
for (const empresa of Object.values(EMPRESAS)) {
  empresas.addRow({ apelido: empresa.apelido, endereco_destino: empresa.email, empresa: empresa.razao, cnpj: empresa.cnpj });
}
mkdirSync(path.join(RAIZ_PROJETO, 'testdata/saida'), { recursive: true });
const destino = path.join(RAIZ_PROJETO, 'testdata/saida/planilha-modelo.xlsx');
await livro.xlsx.writeFile(destino);
console.log(`Planilha modelo gerada em ${path.relative(RAIZ_PROJETO, destino)}`);
