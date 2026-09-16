import './env.mjs';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { RAIZ_PROJETO } from './env.mjs';

const arquivo = path.join(RAIZ_PROJETO, 'n8n/config.local.json');
const novo = !existsSync(arquivo);
const config = JSON.parse(readFileSync(novo ? path.join(RAIZ_PROJETO, 'n8n/config.exemplo.json') : arquivo, 'utf8'));
if (novo) {
  Object.assign(config.configuracao, {
    emails_alerta: process.env.EMAILS_ALERTA ?? '',
    remetente_alertas: process.env.GMAIL_TESTE ?? '',
    n8n_url: 'http://localhost:5678',
    varredura_idade_min_minutos: 5,
  });
  Object.assign(config.gatilhos, { gmail_minutos: 1, varredura_cron: '0 */5 * * * *' });
}
for (const argumento of process.argv.slice(2)) {
  const [chave, ...resto] = argumento.replace(/^--/, '').split('=');
  const bruto = resto.join('=');
  const valor = bruto === 'true' ? true : bruto === 'false' ? false : /^\d+$/.test(bruto) ? Number(bruto) : bruto;
  if (chave in config.gatilhos) config.gatilhos[chave] = valor;
  else config.configuracao[chave] = valor;
}
writeFileSync(arquivo, `${JSON.stringify(config, null, 2)}\n`);
console.log(`n8n/config.local.json ${novo ? 'criado' : 'atualizado'}: ${process.argv.slice(2).join(' ') || '(padrões locais)'}`);
