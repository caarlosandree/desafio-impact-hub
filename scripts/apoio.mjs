const BASE = process.env.N8N_URL ?? 'http://localhost:5678';

async function chamar(metodo, caminho) {
  const resposta = await fetch(`${BASE}/webhook/${caminho}`, { method: metodo });
  if (!resposta.ok) throw new Error(`${metodo} ${caminho} → HTTP ${resposta.status}: ${await resposta.text()}`);
  return resposta.json();
}

export const estado = () => chamar('GET', 'nf-teste-estado');
export const limpar = () => chamar('POST', 'nf-teste-limpar');
export const reprocessar = (assunto) => chamar('POST', `nf-teste-reprocessar?assunto=${encodeURIComponent(assunto)}`);
