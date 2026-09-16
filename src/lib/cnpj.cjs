const { somenteDigitos, somenteAlfanumericos } = require('./texto.cjs'); // @node-only

const PESOS_DV1_CNPJ = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
const PESOS_DV2_CNPJ = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

function digitoVerificadorCnpj(valores, pesos) {
  const soma = pesos.reduce((total, peso, indice) => total + peso * valores[indice], 0);
  const resto = soma % 11;
  return resto < 2 ? 0 : 11 - resto;
}

function calcularDvCnpj(base12) {
  const base = somenteAlfanumericos(base12);
  if (!/^[0-9A-Z]{12}$/.test(base)) throw new Error('A base do CNPJ precisa de 12 posições alfanuméricas.');
  const valores = [...base].map((caractere) => caractere.charCodeAt(0) - 48);
  const dv1 = digitoVerificadorCnpj(valores, PESOS_DV1_CNPJ);
  const dv2 = digitoVerificadorCnpj([...valores, dv1], PESOS_DV2_CNPJ);
  return `${dv1}${dv2}`;
}

function validarCnpj(valor) {
  const cnpj = somenteAlfanumericos(valor);
  if (!/^[0-9A-Z]{12}[0-9]{2}$/.test(cnpj)) return false;
  if (/^(.)\1{13}$/.test(cnpj)) return false;
  return calcularDvCnpj(cnpj.slice(0, 12)) === cnpj.slice(12);
}

function ehCpf(valor) {
  return /^\d{11}$/.test(somenteAlfanumericos(valor));
}

function mascararCpf(valor) {
  const digitos = somenteDigitos(valor);
  if (digitos.length !== 11) return null;
  return `***.${digitos.slice(3, 6)}.${digitos.slice(6, 9)}-**`;
}

function documentoParaGravar(valor) {
  return ehCpf(valor) ? mascararCpf(valor) : somenteAlfanumericos(valor);
}

// A chave de acesso da NFS-e nacional carrega a inscrição de quem emitiu. Se o prestador
// é pessoa física, gravar a chave crua colocaria o CPF inteiro na planilha, o que anularia
// o mascaramento da coluna do documento.
function chaveParaGravar(chave, documento) {
  const texto = String(chave ?? '');
  if (!texto || !ehCpf(documento)) return texto;
  const digitos = somenteDigitos(documento);
  return texto.split(digitos).join(`***${digitos.slice(3, 9)}**`);
}

module.exports = { calcularDvCnpj, validarCnpj, ehCpf, mascararCpf, documentoParaGravar, chaveParaGravar }; // @node-only
