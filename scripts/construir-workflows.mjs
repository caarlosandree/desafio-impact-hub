import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { RAIZ } from '../n8n/construtor.mjs';
import { definirErros } from '../n8n/definicoes/erros.mjs';

const entrega = process.argv.includes('--entrega');
const configLocal = path.join(RAIZ, 'n8n/config.local.json');
const arquivoConfig = !entrega && existsSync(configLocal) ? configLocal : path.join(RAIZ, 'n8n/config.exemplo.json');
const config = JSON.parse(readFileSync(arquivoConfig, 'utf8'));
const destino = path.join(RAIZ, entrega ? 'entrega/2-fluxo-n8n' : 'n8n/workflows');
mkdirSync(destino, { recursive: true });

const definicoes = [['NF-erros.json', definirErros]];
const principal = path.join(RAIZ, 'n8n/definicoes/principal.mjs');
if (existsSync(principal)) definicoes.unshift(['NF-recepcao-e-extracao.json', (await import(principal)).definirPrincipal]);
const apoio = path.join(RAIZ, 'n8n/definicoes/apoio.mjs');
if (!entrega && existsSync(apoio)) definicoes.push(['NF-apoio-aos-testes.json', (await import(apoio)).definirApoio]);

for (const [nome, definir] of definicoes) {
  writeFileSync(path.join(destino, nome), `${JSON.stringify(definir(config).json(), null, 2)}\n`);
}
console.log(`${definicoes.length} workflow(s) em ${path.relative(RAIZ, destino)} usando ${path.relative(RAIZ, arquivoConfig)}`);
