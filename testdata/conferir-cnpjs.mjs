import { EMPRESAS, FORNECEDORES } from './dados.mjs';

// A BrasilAPI responde 403 a requisições sem User-Agent, e um 403 não diz nada
// sobre o CNPJ existir. Só o 404 comprova que o CNPJ é inexistente; qualquer
// outro status é tratado como conferência que não pôde ser feita.
const CABECALHOS = { 'User-Agent': 'desafio-impact-hub/1.0 (conferencia de CNPJ ficticio)' };

const lista = [...Object.values(EMPRESAS), ...Object.values(FORNECEDORES)].filter((item) => item.cnpj);
let problemas = 0;
for (const item of lista) {
  const nome = item.nome ?? item.razao;
  if (/[A-Z]/.test(item.cnpj)) {
    console.log(`${item.cnpj} (${nome}): alfanumérico, conferir manualmente na consulta da Receita`);
    continue;
  }
  const resposta = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${item.cnpj}`, { headers: CABECALHOS });
  if (resposta.status === 404) {
    console.log(`${item.cnpj} (${nome}): não encontrado (HTTP 404)`);
  } else if (resposta.status === 200) {
    console.log(`${item.cnpj} (${nome}): EXISTE — trocar a base em testdata/dados.mjs`);
    problemas++;
  } else {
    console.log(`${item.cnpj} (${nome}): NÃO CONFERIDO — a consulta devolveu HTTP ${resposta.status}`);
    problemas++;
  }
  await new Promise((resolver) => setTimeout(resolver, 1200));
}
if (problemas) console.error(`\n${problemas} CNPJ(s) sem conferência conclusiva.`);
process.exit(problemas ? 1 : 0);
