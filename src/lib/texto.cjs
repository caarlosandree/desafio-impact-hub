function somenteDigitos(valor) {
  return String(valor ?? '').replace(/\D/g, '');
}

function somenteAlfanumericos(valor) {
  return String(valor ?? '').toUpperCase().replace(/[^0-9A-Z]/g, '');
}

function semZerosEsquerda(valor) {
  return String(valor ?? '').replace(/^0+(?=.)/, '');
}

function truncar(valor, limite) {
  if (valor === null || valor === undefined) return null;
  const texto = String(valor);
  return texto.length > limite ? texto.slice(0, limite) : texto;
}

const ENTIDADES_HTML = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };

function decodificarEntidades(texto) {
  return String(texto ?? '').replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (inteiro, codigo) => {
    if (codigo[0] === '#') {
      const numero = codigo[1].toLowerCase() === 'x' ? parseInt(codigo.slice(2), 16) : parseInt(codigo.slice(1), 10);
      return Number.isFinite(numero) ? String.fromCodePoint(numero) : inteiro;
    }
    return ENTIDADES_HTML[codigo.toLowerCase()] ?? inteiro;
  });
}

function htmlParaTexto(html) {
  const semTags = String(html ?? '')
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|tr|li|h[1-6])>/gi, '\n')
    .replace(/<[^>]+>/g, ' ');
  return decodificarEntidades(semTags)
    .replace(/[ \t ]+/g, ' ')
    .replace(/\s*\n\s*/g, '\n')
    .trim();
}

module.exports = { somenteDigitos, somenteAlfanumericos, semZerosEsquerda, truncar, decodificarEntidades, htmlParaTexto }; // @node-only
