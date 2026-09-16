import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { PDFDocument, degrees } from 'pdf-lib';
import { strToU8, zipSync } from 'fflate';
import { EMPRESAS, FORNECEDORES, MARCA, diasAPartirDeHoje } from './dados.mjs';
import { BOLETOS, montarNota } from './notas.mjs';
import { chaveNfe, htmlBoleto, htmlDanfe, htmlDanfse, xmlEvento, xmlNfse } from './modelos.mjs';

const require = createRequire(import.meta.url);
const { lerXmlNfse } = require('../src/lib/xml-nfse.cjs');

const PASTA = path.join(path.dirname(fileURLToPath(import.meta.url)), 'saida', 'arquivos');
rmSync(PASTA, { recursive: true, force: true });
mkdirSync(PASTA, { recursive: true });
const destino = (nome) => path.join(PASTA, nome);

const XMLS = ['n1201', 'n1202', 'n3311', 'n19', 'n1250', 'n501', 'n502', 'n87b', 'n777', 'n460', 'n90', 'n1300', 'n610', 'n611', 'n480'];
for (const id of XMLS) {
  const nota = montarNota(id);
  writeFileSync(destino(`nfse-${nota.numero}-${id}.xml`), xmlNfse(nota));
}
writeFileSync(destino('evento-cancelamento-87.xml'), xmlEvento(montarNota('n87b')));

const navegador = await chromium.launch();
const pagina = await navegador.newPage();
async function pdfDeHtml(html, nome) {
  await pagina.setContent(html, { waitUntil: 'load' });
  await pagina.pdf({ path: destino(nome), format: 'A4', printBackground: true });
}

for (const id of ['n1201', 'n87', 'n455', 'n3310', 'n470', 'n90', 'n3400', 'n1310', 'n5501']) {
  const nota = montarNota(id);
  await pdfDeHtml(htmlDanfse(nota), `danfse-${nota.numero}-${id}.pdf`);
}
await pdfDeHtml(htmlDanfse(montarNota('n1320'), { injecao: true }), 'danfse-1320-injecao.pdf');
for (const [id, boleto] of Object.entries(BOLETOS)) {
  const nota = montarNota(boleto.nota);
  await pdfDeHtml(htmlBoleto(boleto, nota), `boleto-${nota.numero}-${id}.pdf`);
}
const emissaoNfe = diasAPartirDeHoje(-2);
await pdfDeHtml(htmlDanfe({
  numero: '45871', emissao: emissaoNfe, chave: chaveNfe({ cnpj: FORNECEDORES.papelaria.cnpj, numero: '45871', emissao: emissaoNfe }),
  emitente: { nome: FORNECEDORES.papelaria.nome, cnpj: FORNECEDORES.papelaria.cnpj },
  destinatario: { nome: EMPRESAS.mare.razao, cnpj: EMPRESAS.mare.cnpj },
}), 'danfe-45871-papelaria.pdf');

await pagina.setContent(`<div id="logo" style="width:180px;height:56px;display:flex;align-items:center;justify-content:center;background:linear-gradient(90deg,#1b7f5b,#7cc4a4);color:#fff;font:bold 15px Arial;border-radius:8px">Faxina Cuidadosa</div>`);
await pagina.locator('#logo').screenshot({ path: destino('logo-assinatura.png') });
await navegador.close();

async function escanear(origem, nomeFinal) {
  const base = destino(`tmp-${path.basename(origem, '.pdf')}`);
  execFileSync('pdftoppm', ['-r', '110', '-png', '-singlefile', destino(origem), base]);
  const documento = await PDFDocument.create();
  const imagem = await documento.embedPng(readFileSync(`${base}.png`));
  const folha = documento.addPage([595.28, 841.89]);
  const escala = Math.min(560 / imagem.width, 800 / imagem.height);
  folha.drawImage(imagem, { x: 22, y: 30, width: imagem.width * escala, height: imagem.height * escala, rotate: degrees(0.6) });
  documento.setTitle(MARCA);
  writeFileSync(destino(nomeFinal), await documento.save());
  rmSync(`${base}.png`);
}
await escanear('danfse-455-n455.pdf', 'danfse-455-escaneada.pdf');
await escanear('danfse-87-n87.pdf', 'danfse-87-escaneada.pdf');
execFileSync('pdftoppm', ['-r', '100', '-jpeg', '-jpegopt', 'quality=75', '-singlefile', destino('danfse-3310-n3310.pdf'), destino('nota-3310-foto')]);

function qpdf(argumentos) {
  execFileSync('docker', ['run', '--rm', '-v', `${PASTA}:/d`, 'alpine:3.20', 'sh', '-c', `apk add --no-cache qpdf >/dev/null && qpdf ${argumentos}`], { stdio: 'inherit' });
}
qpdf('--encrypt abre123 dono123 256 -- /d/danfse-5501-n5501.pdf /d/danfse-5501-senha.pdf');
qpdf("--encrypt '' dono123 256 --print=none --modify=none --extract=n -- /d/danfse-1310-n1310.pdf /d/danfse-1310-restrita.pdf");

writeFileSync(destino('notas-setembro.zip'), zipSync({
  'nfse-1300.xml': strToU8(xmlNfse(montarNota('n1300'))),
  'LEIA.txt': strToU8(`${MARCA}\nArquivo compactado de teste.`),
}));

// Autoconferência
const falhas = [];
const conferir = (condicao, mensagem) => { if (!condicao) falhas.push(mensagem); };
const textoPdf = (nome) => {
  try {
    return execFileSync('pdftotext', ['-q', destino(nome), '-'], { encoding: 'utf8' });
  } catch {
    return null;
  }
};
for (const id of XMLS) {
  const nota = montarNota(id);
  const lido = lerXmlNfse(readFileSync(destino(`nfse-${nota.numero}-${id}.xml`), 'utf8'));
  conferir(lido.tipo === 'nfse' && lido.nota.chave_acesso === nota.chave && lido.nota.chave_acesso.length === 50, `XML ${id} não lido como NFS-e de 50 posições`);
}
conferir(lerXmlNfse(readFileSync(destino('evento-cancelamento-87.xml'), 'utf8')).tipo === 'evento', 'evento não reconhecido');
conferir(textoPdf('danfse-1201-n1201.pdf')?.replace(/\s/g, '').includes(montarNota('n1201').chave), 'DANFSe 1201 sem a chave no texto');
conferir((textoPdf('danfse-455-escaneada.pdf') ?? '').trim() === '', 'PDF escaneado ainda tem texto');
conferir(textoPdf('danfse-5501-senha.pdf') === null, 'PDF com senha abriu sem senha');
conferir((textoPdf('danfse-1310-restrita.pdf') ?? '').includes('1310'), 'PDF restrito não foi lido');
conferir(statSync(destino('logo-assinatura.png')).size < 30 * 1024, 'logo tem 30 KB ou mais');
conferir(statSync(destino('nota-3310-foto.jpg')).size >= 30 * 1024, 'foto tem menos de 30 KB');
conferir(existsSync(destino('danfe-45871-papelaria.pdf')), 'DANFE não gerado');

if (falhas.length) {
  console.error(`Falhas na geração:\n- ${falhas.join('\n- ')}`);
  process.exit(1);
}
console.log(`Arquivos de teste gerados e conferidos em ${PASTA}`);
