const { mesDe } = require('./datas.cjs'); // @node-only
const { documentoParaGravar } = require('./cnpj.cjs'); // @node-only
const { linhasValidas } = require('./linhas.cjs'); // @node-only
const { validarNota, criarMotivo, formatarMotivos, formatarObservacoes, juntarObservacao } = require('./validacao.cjs'); // @node-only
const { chaveDuplicidade, idDaChave, decidirDuplicidade } = require('./duplicidade.cjs'); // @node-only
const { consultaDrive } = require('./drive.cjs'); // @node-only

function extensaoDoArquivo(anexo) {
  const nome = String(anexo.nome ?? '');
  const extensao = nome.includes('.') ? nome.split('.').pop().toLowerCase().replace(/[^a-z0-9]/g, '') : '';
  if (extensao) return extensao;
  if (anexo.tipo === 'pdf') return 'pdf';
  if (anexo.tipo === 'xml') return 'xml';
  return 'bin';
}

function nomeSeguroArquivo(texto) {
  return String(texto ?? '').replace(/[\\/:*?"<>|\x00-\x1f]/g, '_').trim() || 'arquivo';
}

function colunasDeOrigem(pacote) {
  return {
    origem: pacote.origem === 'email' ? 'E-mail' : 'Formulário',
    origem_id: pacote.origem_id,
    enviado_por: pacote.enviado_por ?? '',
    recebido_em: pacote.recebido_em,
  };
}

function linhaDaNota(nota, { id, chave, status, motivos, pacote }) {
  return {
    id,
    status,
    motivos: formatarMotivos(motivos),
    observacoes: formatarObservacoes(nota.observacoes ?? []),
    empresa: pacote.empresa?.apelido ?? '',
    prestador_nome: nota.prestador_nome ?? '',
    prestador_documento: documentoParaGravar(nota.prestador_documento),
    numero: nota.numero ?? '',
    chave_acesso: nota.chave_acesso ?? '',
    emissao: nota.data_emissao ?? '',
    competencia: nota.competencia ?? '',
    descricao_servico: nota.descricao_servico ?? '',
    valor_servico: nota.valor_servico ?? '',
    retencoes_total: nota.retencoes_total ?? '',
    valor_liquido: nota.valor_liquido ?? '',
    vencimento: nota.vencimento ?? '',
    vencimento_fonte: nota.vencimento_fonte ?? '',
    vencimento_trecho: nota.vencimento_trecho ?? '',
    lido_por: nota.lido_por ?? '',
    arquivos: '',
    ...colunasDeOrigem(pacote),
    chave_duplicidade: chave,
  };
}

function linhaDaRevisao(pacote, { id, chave, motivos }) {
  const vazia = linhaDaNota({ observacoes: [] }, { id, chave, status: 'Revisão', motivos, pacote });
  return { ...vazia, prestador_documento: '', lido_por: '' };
}

function planoVazio(base) {
  return {
    origem: base.origem, origem_id: base.origem_id, message_id: base.message_id, recebido_em: base.recebido_em,
    notas: [], atualizacoes: [], arquivos: [], ocorrencias: [], resultado: [], etiqueta: null, consulta_drive: '',
  };
}

function planejarRegistro(pacote, consolidado, contexto) {
  const { sha256, config, hoje } = contexto;
  const linhasNotas = linhasValidas(contexto.linhasNotas);
  const hashesRegistrados = new Set(linhasValidas(contexto.linhasArquivos).map((linha) => String(linha.hash_sha256)));
  const mes = mesDe(pacote.recebido_em);
  const pastaDasNotas = pacote.empresa ? pacote.empresa.apelido : '_Revisao';
  const plano = planoVazio(pacote);
  const usados = new Set();

  const adicionarArquivos = (ligados, notaId, rotulo, pasta, semNota) => {
    const contagem = {};
    for (const ligado of ligados) {
      if (!ligado.chave || usados.has(ligado.chave)) continue;
      const anexo = pacote.anexos.find((item) => item.chave === ligado.chave);
      if (!anexo) continue;
      usados.add(ligado.chave);
      contagem[ligado.tipo] = (contagem[ligado.tipo] ?? 0) + 1;
      const sufixo = contagem[ligado.tipo] > 1 ? String(contagem[ligado.tipo]) : '';
      const nome = semNota
        ? `${pacote.origem_id}_${nomeSeguroArquivo(anexo.nome)}`
        : `${notaId}_${nomeSeguroArquivo(rotulo)}_${ligado.tipo}${sufixo}.${extensaoDoArquivo(anexo)}`;
      plano.arquivos.push({
        anexo_chave: anexo.chave, pasta: [pasta, mes], nome, mime: anexo.mime || 'application/octet-stream',
        hash: anexo.hash, nota_id: notaId, registrar_hash: !hashesRegistrados.has(anexo.hash),
      });
    }
  };

  consolidado.notas.forEach((nota, indice) => {
    const chave = chaveDuplicidade(nota, pacote.origem_id, indice, sha256);
    const decisao = decidirDuplicidade(nota, chave, pacote.origem_id, linhasNotas, sha256);
    if (decisao.acao === 'duplicata') {
      const idExistente = String(decisao.existente.id);
      plano.ocorrencias.push({
        tipo: 'DUPLICATA_NOTA', origem_id: pacote.origem_id, nota_id: idExistente,
        descricao: `Nota ${nota.numero ?? 's/n'}${pacote.empresa ? ` da ${pacote.empresa.apelido}` : ''} já registrada; não foi gravada de novo.`,
      });
      plano.resultado.push({ situacao: 'duplicata', id: idExistente, numero: nota.numero ?? '', status: String(decisao.existente.status ?? ''), motivos: '' });
      return;
    }
    const retomada = decisao.acao === 'retomada';
    const id = retomada ? String(decisao.existente.id) : idDaChave(chave, sha256);
    const chaveFinal = retomada ? String(decisao.existente.chave_duplicidade) : chave;
    const motivos = validarNota(nota, { empresa: pacote.empresa, motivosPacote: pacote.motivos_pacote, hoje, config, linhasNotas });
    const status = motivos.length ? 'Revisão' : 'Extraída';
    adicionarArquivos(nota.arquivos_ligados ?? [], id, nota.numero || 'sn', pastaDasNotas, false);
    plano.notas.push({ acao: decisao.acao, id, chave_duplicidade: chaveFinal, linha: linhaDaNota(nota, { id, chave: chaveFinal, status, motivos, pacote }) });
    plano.resultado.push({
      situacao: retomada ? 'ja_registrada' : 'registrada', id, numero: nota.numero ?? '',
      status: retomada ? String(decisao.existente.status ?? status) : status, motivos: formatarMotivos(motivos),
    });
    if (nota.chave_nota_substituida) {
      const original = linhasNotas.find((linha) => String(linha.chave_duplicidade) === nota.chave_nota_substituida);
      if (original) {
        plano.atualizacoes.push({
          chave_duplicidade: String(original.chave_duplicidade),
          observacoes: juntarObservacao(original.observacoes, `Substituída pela nota ${nota.numero ?? nota.chave_acesso}`),
        });
      }
    }
  });

  if (consolidado.linha_propria) {
    const chave = `origem:${pacote.origem_id}`;
    const id = idDaChave(chave, sha256);
    const existente = linhasNotas.find((linha) => String(linha.chave_duplicidade) === chave);
    const motivos = consolidado.linha_propria.motivos.map((codigo) => criarMotivo(codigo));
    adicionarArquivos(consolidado.linha_propria.arquivos_ligados, id, '', '_Revisao', true);
    plano.notas.push({ acao: existente ? 'retomada' : 'nova', id, chave_duplicidade: chave, linha: linhaDaRevisao(pacote, { id, chave, motivos }) });
    plano.resultado.push({ situacao: existente ? 'ja_registrada' : 'registrada', id, numero: '', status: 'Revisão', motivos: formatarMotivos(motivos) });
  }

  if (pacote.origem === 'email') {
    const gravadas = plano.resultado.filter((item) => item.situacao !== 'duplicata');
    if (gravadas.some((item) => item.status === 'Revisão')) plano.etiqueta = 'NF/revisao';
    else plano.etiqueta = gravadas.length ? 'NF/processada' : 'NF/duplicada';
  }
  plano.consulta_drive = plano.arquivos.length ? consultaDrive(plano.arquivos) : '';
  return plano;
}

function planoSemLeitura(decisao) {
  const plano = planoVazio(decisao);
  if (decisao.acao === 'duplicata_arquivo') {
    const empresa = decisao.empresa ? ` para a ${decisao.empresa.apelido}` : '';
    const numero = decisao.numero_existente ? ` (nota ${decisao.numero_existente})` : '';
    plano.ocorrencias.push({ tipo: 'DUPLICATA_ARQUIVO', origem_id: decisao.origem_id, nota_id: decisao.nota_id_existente, descricao: `Arquivos já registrados${empresa}${numero}; nenhuma leitura feita.` });
    plano.resultado.push({ situacao: 'duplicata', id: decisao.nota_id_existente, numero: decisao.numero_existente ?? '', status: '', motivos: '' });
    plano.etiqueta = decisao.origem === 'email' ? 'NF/duplicada' : null;
    return plano;
  }
  plano.resultado = decisao.notas_existentes.map((nota) => ({ situacao: 'ja_registrada', ...nota }));
  plano.etiqueta = decisao.etiqueta;
  return plano;
}

function montarLinhas(plano, links, contexto) {
  const notas = plano.notas.map((nota) => {
    const arquivos = plano.arquivos
      .filter((arquivo) => arquivo.nota_id === nota.id)
      .map((arquivo) => links[arquivo.anexo_chave])
      .filter(Boolean)
      .join('\n');
    return nota.acao === 'retomada' ? { chave_duplicidade: nota.chave_duplicidade, arquivos } : { ...nota.linha, arquivos };
  });
  const atualizacoes = plano.atualizacoes.map((item) => ({ chave_duplicidade: item.chave_duplicidade, observacoes: item.observacoes }));
  const arquivos = plano.arquivos
    .filter((arquivo) => arquivo.registrar_hash && links[arquivo.anexo_chave])
    .map((arquivo) => ({
      hash_sha256: arquivo.hash, nota_id: arquivo.nota_id, nome_arquivo: arquivo.nome,
      origem_id: plano.origem_id, recebido_em: plano.recebido_em, link: links[arquivo.anexo_chave],
    }));
  const ocorrencias = plano.ocorrencias.map((ocorrencia) => ({
    data_hora: contexto.agora, tipo: ocorrencia.tipo, origem_id: ocorrencia.origem_id, nota_id: ocorrencia.nota_id ?? '',
    descricao: ocorrencia.descricao, link_execucao: contexto.linkExecucao,
  }));
  return { notas: [...notas, ...atualizacoes], arquivos, ocorrencias };
}

module.exports = { planejarRegistro, planoSemLeitura, montarLinhas }; // @node-only
