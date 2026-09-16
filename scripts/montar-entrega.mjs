import './env.mjs';
import { execFileSync } from 'node:child_process';
import { copyFileSync, cpSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { RAIZ_PROJETO } from './env.mjs';

const ENTREGA = path.join(RAIZ_PROJETO, 'entrega');
const copiar = (origem, destino) => {
  mkdirSync(path.dirname(path.join(ENTREGA, destino)), { recursive: true });
  copyFileSync(path.join(RAIZ_PROJETO, origem), path.join(ENTREGA, destino));
};

execFileSync('node', ['scripts/construir-workflows.mjs', '--entrega'], { cwd: RAIZ_PROJETO, stdio: 'inherit' });
copiar('infra/docker-compose.yml', '2-fluxo-n8n/docker-compose.yml');
copiar('docs/entrega/2-fluxo-n8n-LEIA-ME.md', '2-fluxo-n8n/LEIA-ME.md');
copiar('docs/entrega/credenciais-modelo.json', '2-fluxo-n8n/credenciais-modelo.json');
copiar('testdata/saida/planilha-modelo.xlsx', '2-fluxo-n8n/planilha-modelo.xlsx');
cpSync(path.join(RAIZ_PROJETO, 'testdata/saida/arquivos'), path.join(ENTREGA, '5-notas-de-teste/arquivos'), { recursive: true });
copiar('testes/execucao.md', '5-notas-de-teste/tabela-de-execucao.md');
copiar('testes/injecao.md', '5-notas-de-teste/teste-de-injecao.md');

const obrigatorios = ['0-LEIA-ME.pdf', '1-desenho-da-solucao.pdf', '3-video.mp4', '4-documentacao-trecho-1.pdf', '2-fluxo-n8n/NF-recepcao-e-extracao.json', '2-fluxo-n8n/NF-erros.json'];
const faltando = obrigatorios.filter((arquivo) => !existsSync(path.join(ENTREGA, arquivo)));

const segredos = ['GEMINI_API_KEY', 'SMTP_SENHA_APP', 'GOOGLE_CLIENT_SECRET', 'N8N_DONO_SENHA', 'N8N_MEMBRO_SENHA']
  .map((nome) => process.env[nome])
  .filter((valor) => valor && valor.length >= 8);
const vazamentos = [];
const varrer = (pasta) => {
  for (const nome of readdirSync(pasta)) {
    const caminho = path.join(pasta, nome);
    if (statSync(caminho).isDirectory()) { varrer(caminho); continue; }
    const conteudo = readFileSync(caminho).toString('latin1');
    if (segredos.some((segredo) => conteudo.includes(segredo))) vazamentos.push(path.relative(ENTREGA, caminho));
  }
};
varrer(ENTREGA);
const principal = readFileSync(path.join(ENTREGA, '2-fluxo-n8n/NF-recepcao-e-extracao.json'), 'utf8');
if (!principal.includes('COLE_O_ID_DA_PLANILHA')) vazamentos.push('workflow de entrega não usa a configuração de exemplo');
if (existsSync(path.join(ENTREGA, '2-fluxo-n8n/NF-apoio-aos-testes.json'))) vazamentos.push('workflow de apoio não deve ir na entrega');

console.log(execFileSync('find', ['.', '-maxdepth', '2', '-not', '-path', './5-notas-de-teste/arquivos/*'], { cwd: ENTREGA, encoding: 'utf8' }));
if (faltando.length) console.log(`FALTANDO: ${faltando.join(', ')}`);
if (vazamentos.length) {
  console.error(`PROBLEMA: ${vazamentos.join(', ')}`);
  process.exit(1);
}
console.log(faltando.length ? 'Entrega montada, mas incompleta.' : 'Entrega completa e sem segredos.');
