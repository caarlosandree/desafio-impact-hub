import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const RAIZ_PROJETO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const arquivoEnv = path.join(RAIZ_PROJETO, 'infra/.env');
if (existsSync(arquivoEnv)) {
  for (const linha of readFileSync(arquivoEnv, 'utf8').split('\n')) {
    const achado = linha.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (achado && !(achado[1] in process.env)) process.env[achado[1]] = achado[2];
  }
}

export function exigir(...nomes) {
  const faltando = nomes.filter((nome) => !process.env[nome]);
  if (faltando.length) throw new Error(`Preencha em infra/.env: ${faltando.join(', ')}`);
}
