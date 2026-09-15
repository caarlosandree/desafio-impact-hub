const FUSO_SAO_PAULO = 'America/Sao_Paulo';

function partesEmSaoPaulo(data) {
  const formato = new Intl.DateTimeFormat('en-CA', {
    timeZone: FUSO_SAO_PAULO, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  });
  return Object.fromEntries(formato.formatToParts(new Date(data)).map((parte) => [parte.type, parte.value]));
}

function dataSaoPaulo(data = new Date()) {
  const p = partesEmSaoPaulo(data);
  return `${p.year}-${p.month}-${p.day}`;
}

function dataHoraSaoPaulo(data = new Date()) {
  const p = partesEmSaoPaulo(data);
  return `${p.year}-${p.month}-${p.day} ${p.hour}:${p.minute}`;
}

function normalizarData(valor) {
  if (valor === null || valor === undefined) return null;
  const texto = String(valor).trim();
  let ano;
  let mes;
  let dia;
  let achado = texto.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (achado) [, ano, mes, dia] = achado;
  else if ((achado = texto.match(/^(\d{2})\/(\d{2})\/(\d{4})$/))) [, dia, mes, ano] = achado;
  else return null;
  const data = new Date(Date.UTC(Number(ano), Number(mes) - 1, Number(dia)));
  const confere = data.getUTCFullYear() === Number(ano) && data.getUTCMonth() === Number(mes) - 1 && data.getUTCDate() === Number(dia);
  return confere ? `${ano}-${mes}-${dia}` : null;
}

function diasEntre(inicioIso, fimIso) {
  return Math.round((Date.parse(`${fimIso}T00:00:00Z`) - Date.parse(`${inicioIso}T00:00:00Z`)) / 86400000);
}

function mesDe(dataIso) {
  return String(dataIso).slice(0, 7);
}

module.exports = { dataSaoPaulo, dataHoraSaoPaulo, normalizarData, diasEntre, mesDe }; // @node-only
