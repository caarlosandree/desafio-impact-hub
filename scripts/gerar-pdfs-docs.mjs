import './env.mjs';
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { marked } from 'marked';
import { chromium } from 'playwright';
import { RAIZ_PROJETO } from './env.mjs';

const ESTILO = `
  body { font-family: Arial, Helvetica, sans-serif; font-size: 11px; line-height: 1.45; color: #1a1a1a; }
  h1 { font-size: 20px; color: #0b5d4b; margin-bottom: 4px; } h2 { font-size: 15px; color: #0b5d4b; border-bottom: 1.5px solid #0b5d4b; padding-bottom: 2px; margin-top: 18px; }
  h3 { font-size: 12.5px; margin-top: 12px; }
  table { width: 100%; border-collapse: collapse; margin: 6px 0 10px; page-break-inside: auto; } tr { page-break-inside: avoid; }
  th, td { border: 1px solid #c9d3d0; padding: 4px 6px; text-align: left; vertical-align: top; } th { background: #e8f2ef; }
  code { background: #f1f3f2; padding: 0 3px; border-radius: 3px; font-size: 10px; }
  pre { background: #f1f3f2; padding: 6px; white-space: pre-wrap; font-size: 9.5px; }
  blockquote { border-left: 3px solid #0b5d4b; margin: 6px 0; padding: 2px 10px; color: #333; }
`;

const DOCUMENTOS = [
  { origem: 'docs/entrega/0-LEIA-ME.md', saida: '0-LEIA-ME.pdf', titulo: 'LEIA-ME' },
  { origem: 'docs/entrega/1-desenho-da-solucao.html', saida: '1-desenho-da-solucao.pdf', maxPaginas: 2 },
  { origem: 'docs/entrega/4-guia-do-financeiro.md', saida: '4-documentacao-trecho-1.pdf', titulo: 'Guia do financeiro' },
];

const destino = path.join(RAIZ_PROJETO, 'entrega');
mkdirSync(destino, { recursive: true });
const navegador = await chromium.launch();
const pagina = await navegador.newPage();
for (const documento of DOCUMENTOS) {
  const bruto = readFileSync(path.join(RAIZ_PROJETO, documento.origem), 'utf8');
  const html = documento.origem.endsWith('.md')
    ? `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>${documento.titulo}</title><style>${ESTILO}</style></head><body>${marked.parse(bruto)}</body></html>`
    : bruto;
  await pagina.setContent(html, { waitUntil: 'load' });
  const arquivo = path.join(destino, documento.saida);
  await pagina.pdf(documento.maxPaginas
    ? { path: arquivo, format: 'A4', printBackground: true, preferCSSPageSize: true }
    : {
      path: arquivo, format: 'A4', printBackground: true, margin: { top: '16mm', bottom: '16mm', left: '15mm', right: '15mm' },
      displayHeaderFooter: true, headerTemplate: '<div></div>',
      footerTemplate: '<div style="font-size:8px;width:100%;text-align:center;color:#666"><span class="pageNumber"></span> / <span class="totalPages"></span></div>',
    });
  const paginas = Number(execFileSync('pdfinfo', [arquivo], { encoding: 'utf8' }).match(/Pages:\s+(\d+)/)[1]);
  if (documento.maxPaginas && paginas > documento.maxPaginas) {
    throw new Error(`${documento.saida} ficou com ${paginas} páginas; o limite é ${documento.maxPaginas}. Enxugue o texto.`);
  }
  console.log(`${documento.saida}: ${paginas} página(s)`);
}
await navegador.close();
