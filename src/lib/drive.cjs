const { linhasValidas } = require('./linhas.cjs'); // @node-only

const MIME_PASTA_DRIVE = 'application/vnd.google-apps.folder';

function caminhoDaPasta(pasta) {
  return pasta.join('/');
}

function escaparConsultaDrive(texto) {
  return String(texto).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

function consultaDrive(arquivos) {
  const nomes = [...new Set(arquivos.map((arquivo) => arquivo.nome))];
  const porNome = nomes.map((nome) => `name = '${escaparConsultaDrive(nome)}'`);
  return `trashed = false and (mimeType = '${MIME_PASTA_DRIVE}' or ${porNome.join(' or ')})`;
}

function planejarPastas(plano, itensDrive, raizId) {
  const pastas = linhasValidas(itensDrive).filter((item) => item.mimeType === MIME_PASTA_DRIVE);
  const acharPasta = (nome, paiId) => pastas.find((pasta) => pasta.name === nome && (pasta.parents ?? []).includes(paiId)) ?? null;
  const pastas_mes = {};
  const pastas_criar = [];
  for (const caminho of [...new Set(plano.arquivos.map((arquivo) => caminhoDaPasta(arquivo.pasta)))]) {
    const [nomeEmpresa, nomeMes] = caminho.split('/');
    const pastaEmpresa = acharPasta(nomeEmpresa, raizId);
    if (!pastaEmpresa) {
      throw new Error(`A pasta "${nomeEmpresa}" não existe dentro da pasta NF do Drive. Crie a pasta com esse nome e reprocesse.`);
    }
    const pastaMes = acharPasta(nomeMes, pastaEmpresa.id);
    if (pastaMes) pastas_mes[caminho] = pastaMes.id;
    else pastas_criar.push({ caminho, nome: nomeMes, pai_id: pastaEmpresa.id });
  }
  return { pastas_mes, pastas_criar };
}

function linkDoArquivoDrive(id) {
  return `https://drive.google.com/file/d/${id}/view`;
}

function separarEnvios(plano, itensDrive, pastasMes) {
  const existentes = linhasValidas(itensDrive).filter((item) => item.mimeType !== MIME_PASTA_DRIVE);
  const enviar = [];
  const links = {};
  for (const arquivo of plano.arquivos) {
    const pastaId = pastasMes[caminhoDaPasta(arquivo.pasta)];
    if (!pastaId) throw new Error(`A pasta ${caminhoDaPasta(arquivo.pasta)} não foi encontrada nem criada no Drive.`);
    const existente = existentes.find((item) => item.name === arquivo.nome && (item.parents ?? []).includes(pastaId));
    if (existente) links[arquivo.anexo_chave] = linkDoArquivoDrive(existente.id);
    else enviar.push({ ...arquivo, pasta_id: pastaId });
  }
  return { enviar, links };
}

module.exports = { MIME_PASTA_DRIVE, consultaDrive, planejarPastas, separarEnvios, linkDoArquivoDrive }; // @node-only
