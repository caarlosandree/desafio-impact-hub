const ETIQUETAS_NF = ['NF/processada', 'NF/revisao', 'NF/duplicada', 'NF/erro'];

function mapearEtiquetas(etiquetas) {
  const ids = {};
  for (const etiqueta of etiquetas ?? []) {
    if (etiqueta && ETIQUETAS_NF.includes(etiqueta.name)) ids[etiqueta.name] = etiqueta.id;
  }
  const faltando = ETIQUETAS_NF.filter((nome) => !ids[nome]);
  if (faltando.length) {
    throw new Error(`Etiquetas ausentes no Gmail: ${faltando.join(', ')}. Crie as etiquetas antes de ativar o fluxo.`);
  }
  return ids;
}

function consultaSemEtiquetasNf() {
  return ETIQUETAS_NF.map((nome) => `-label:${nome.toLowerCase().replace(/\//g, '-')}`).join(' ');
}

module.exports = { ETIQUETAS_NF, mapearEtiquetas, consultaSemEtiquetasNf }; // @node-only
