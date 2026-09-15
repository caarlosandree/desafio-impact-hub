const { linhasValidas } = require('./linhas.cjs'); // @node-only

const TIPO_POR_EXTENSAO = { xml: 'xml', pdf: 'pdf', jpg: 'imagem', jpeg: 'imagem', png: 'imagem' };

function tipoDoAnexo(anexo) {
  const nome = String(anexo.nome ?? '').toLowerCase();
  const extensao = nome.includes('.') ? nome.split('.').pop() : '';
  if (TIPO_POR_EXTENSAO[extensao]) return TIPO_POR_EXTENSAO[extensao];
  const inicio = String(anexo.base64 ?? '').slice(0, 16);
  if (inicio.startsWith('JVBERi0')) return 'pdf';
  if (inicio.startsWith('iVBORw0KGgo') || inicio.startsWith('/9j/')) return 'imagem';
  if (String(anexo.mime ?? '').toLowerCase().includes('xml')) return 'xml';
  return null;
}

function triarAnexos(pacote, config) {
  const aproveitaveis = [];
  const naoSuportados = [];
  const ignorados = [];
  for (const anexo of pacote.anexos) {
    const tipo = tipoDoAnexo(anexo);
    if (tipo === null) naoSuportados.push({ ...anexo, tipo: 'outro' });
    else if (tipo === 'imagem' && anexo.tamanho_bytes < config.imagem_min_kb * 1024) ignorados.push(anexo.chave);
    else aproveitaveis.push({ ...anexo, tipo });
  }
  const motivos_arquivo = [];
  if (naoSuportados.length) motivos_arquivo.push('ARQUIVO_NAO_SUPORTADO');
  if (!aproveitaveis.length && !naoSuportados.length) motivos_arquivo.push('SEM_ANEXO');
  return { ...pacote, anexos: [...aproveitaveis, ...naoSuportados], ignorados, motivos_arquivo };
}

function etiquetaPorLinhas(linhasDaOrigem) {
  if (linhasDaOrigem.some((linha) => linha.status === 'Revisão')) return 'NF/revisao';
  if (linhasDaOrigem.length) return 'NF/processada';
  return 'NF/duplicada';
}

function decidirPorHashes(pacote, linhasArquivos, linhasNotas) {
  const registros = new Map(linhasValidas(linhasArquivos).map((linha) => [String(linha.hash_sha256), linha]));
  const notas = linhasValidas(linhasNotas);
  const mesmaOrigem = (anexo) => String(registros.get(anexo.hash).origem_id) === pacote.origem_id;
  const registrados = pacote.anexos.filter((anexo) => registros.has(anexo.hash));
  if (pacote.anexos.length && registrados.length === pacote.anexos.length) {
    if (registrados.some(mesmaOrigem)) {
      const linhasDaOrigem = notas.filter((linha) => String(linha.origem_id) === pacote.origem_id);
      return {
        ...pacote,
        acao: 'retomada_total',
        etiqueta: pacote.origem === 'email' ? etiquetaPorLinhas(linhasDaOrigem) : null,
        notas_existentes: linhasDaOrigem.map((linha) => ({
          id: String(linha.id), numero: String(linha.numero ?? ''), status: String(linha.status ?? ''), motivos: String(linha.motivos ?? ''),
        })),
      };
    }
    const notaId = String(registros.get(registrados[0].hash).nota_id ?? '');
    const notaExistente = notas.find((linha) => String(linha.id) === notaId);
    return { ...pacote, acao: 'duplicata_arquivo', nota_id_existente: notaId, numero_existente: String(notaExistente?.numero ?? '') };
  }
  return { ...pacote, acao: 'ler', anexos: pacote.anexos.filter((anexo) => !registros.has(anexo.hash) || mesmaOrigem(anexo)) };
}

module.exports = { tipoDoAnexo, triarAnexos, decidirPorHashes }; // @node-only
