const BASE = process.env.N8N_URL ?? 'http://localhost:5678';
const esperar = (ms) => new Promise((resolver) => setTimeout(resolver, ms));

// A cota de leitura do Google Planilhas é de 60 chamadas por minuto por usuário e o
// fluxo principal também lê a planilha. Quando estoura, o webhook devolve 500; esperar
// e tentar de novo resolve, e evita que a bateria registre uma falha que não é do fluxo.
async function chamar(metodo, caminho, tentativas = 3) {
  let ultimoErro = null;
  for (let tentativa = 1; tentativa <= tentativas; tentativa++) {
    const resposta = await fetch(`${BASE}/webhook/${caminho}`, { method: metodo });
    if (resposta.ok) return resposta.json();
    ultimoErro = new Error(`${metodo} ${caminho} → HTTP ${resposta.status}: ${await resposta.text()}`);
    if (tentativa < tentativas) await esperar(30000);
  }
  throw ultimoErro;
}

export const estado = () => chamar('GET', 'nf-teste-estado');
export const limpar = () => chamar('POST', 'nf-teste-limpar');
export const reprocessar = (assunto) => chamar('POST', `nf-teste-reprocessar?assunto=${encodeURIComponent(assunto)}`);
