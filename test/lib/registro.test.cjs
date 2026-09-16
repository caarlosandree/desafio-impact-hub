const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { lerXmlsDoPacote, avaliarPdfs } = require('../../src/lib/leitura.cjs');
const { consolidar } = require('../../src/lib/consolidacao.cjs');
const { planejarRegistro, planoSemLeitura, montarLinhas } = require('../../src/lib/registro.cjs');
const { CHAVE_A, CHAVE_B, xmlNfseSimples, pacoteBase, documentoIa } = require('./fixtures.cjs');

const sha256 = (texto) => crypto.createHash('sha256').update(texto).digest('hex');
const CONTEXTO = { sha256, config: { emissao_max_dias: 180, vencimento_max_dias: 120 }, hoje: '2026-09-15', linhasNotas: [], linhasArquivos: [] };
const ID_A = sha256(CHAVE_A).slice(0, 8);

function cenarioT01(sobrescrever = {}) {
  const pacote = avaliarPdfs(lerXmlsDoPacote(pacoteBase({
    anexos: [
      { chave: 'x', tipo: 'xml', nome: 'NFSe 1201.xml', mime: 'text/xml', hash: 'hx' },
      { chave: 'danfse', tipo: 'pdf', nome: 'DANFSe 1201.pdf', mime: 'application/pdf', hash: 'hd' },
      { chave: 'boleto', tipo: 'pdf', nome: 'boleto.pdf', mime: 'application/pdf', hash: 'hb' },
    ],
    ...sobrescrever,
  }), () => xmlNfseSimples()), [{ chave: 'danfse', texto: CHAVE_A, erro: null }, { chave: 'boleto', texto: '', erro: null }]);
  const leituraIa = { documentos: [documentoIa({ tipo: 'boleto', arquivo: 1, valor_documento: 1500, vencimento: '2026-09-25', vencimento_trecho: 'Vencimento 25/09/2026' })], vencimento_corpo_email: { data: null, trecho: null } };
  return { pacote, consolidado: consolidar(pacote, leituraIa, 'gemini-3.5-flash-lite') };
}

test('nota nova: linha completa, arquivos nomeados sem dado pessoal e etiqueta processada', () => {
  const { pacote, consolidado } = cenarioT01();
  const plano = planejarRegistro(pacote, consolidado, CONTEXTO);
  assert.equal(plano.notas.length, 1);
  const [nota] = plano.notas;
  assert.equal(nota.acao, 'nova');
  assert.equal(nota.id, ID_A);
  assert.equal(nota.linha.status, 'Extraída');
  assert.equal(nota.linha.motivos, '');
  assert.equal(nota.linha.chave_duplicidade, CHAVE_A);
  assert.equal(nota.linha.vencimento, '2026-09-25');
  assert.equal(nota.linha.vencimento_fonte, 'Boleto');
  assert.equal(nota.linha.lido_por, 'XML');
  assert.equal(nota.linha.origem, 'E-mail');
  assert.equal(nota.linha.empresa, 'Colmeia');
  assert.equal(nota.linha.prestador_documento, '11222333000181');
  assert.deepEqual(plano.arquivos.map((a) => [a.nome, a.pasta.join('/'), a.registrar_hash]), [
    [`${ID_A}_1201_xml.xml`, 'Colmeia/2026-09', true],
    [`${ID_A}_1201_nota.pdf`, 'Colmeia/2026-09', true],
    [`${ID_A}_1201_boleto.pdf`, 'Colmeia/2026-09', true],
  ]);
  assert.equal(plano.etiqueta, 'NF/processada');
  assert.deepEqual(plano.resultado, [{ situacao: 'registrada', id: ID_A, numero: '1201', status: 'Extraída', motivos: '' }]);
  assert.equal(plano.consulta_drive.includes(`${ID_A}_1201_xml.xml`), true);
});

test('duplicata de outra origem vira ocorrência e não gera arquivo', () => {
  const { pacote, consolidado } = cenarioT01();
  const linhasNotas = [{ id: '00aa11bb', chave_duplicidade: CHAVE_A, origem_id: 'outro-email', numero: '1201', prestador_documento: '11222333000181', status: 'Extraída' }];
  const plano = planejarRegistro(pacote, consolidado, { ...CONTEXTO, linhasNotas });
  assert.deepEqual(plano.notas, []);
  assert.deepEqual(plano.arquivos, []);
  assert.deepEqual(plano.ocorrencias, [{ tipo: 'DUPLICATA_NOTA', origem_id: 'msg-1', nota_id: '00aa11bb', descricao: 'Nota 1201 da Colmeia já registrada; não foi gravada de novo.' }]);
  assert.equal(plano.etiqueta, 'NF/duplicada');
});

test('retomada da mesma origem só completa arquivos e hashes', () => {
  const { pacote, consolidado } = cenarioT01();
  const linhasNotas = [{ id: '00aa11bb', chave_duplicidade: CHAVE_A, origem_id: 'msg-1', numero: '1201', prestador_documento: '11222333000181', status: 'Extraída' }];
  const plano = planejarRegistro(pacote, consolidado, { ...CONTEXTO, linhasNotas, linhasArquivos: [{ hash_sha256: 'hx', origem_id: 'msg-1' }] });
  assert.equal(plano.notas[0].acao, 'retomada');
  assert.equal(plano.notas[0].id, '00aa11bb');
  const linhas = montarLinhas(plano, { x: 'L1', danfse: 'L2', boleto: 'L3' }, { agora: '2026-09-15 10:05', linkExecucao: 'http://n8n/exec/1' });
  assert.deepEqual(linhas.notas, [{ chave_duplicidade: CHAVE_A, arquivos: 'L1\nL2\nL3' }]);
  assert.deepEqual(linhas.arquivos.map((a) => a.hash_sha256), ['hd', 'hb']);
  assert.equal(linhas.arquivos[0].nota_id, '00aa11bb');
  assert.equal(linhas.arquivos[0].link, 'L2');
});

test('nota emitida por CPF: nada no plano contém o CPF inteiro', () => {
  const pacote = pacoteBase({ anexos: [{ chave: 'p', tipo: 'pdf', nome: 'nota.pdf', mime: 'application/pdf', hash: 'hp' }] });
  const nota = {
    ...documentoIa({ numero: '5', prestador_documento: '12345678909', prestador_nome: 'Rafael Tavares', tomador_cnpj: '12ABC34501DE35', data_emissao: '2026-09-10', valor_servico: 800, valor_liquido: 800 }),
    lido_por: 'IA (m)', arquivo_chave: 'p', arquivos_ligados: [{ chave: 'p', tipo: 'nota' }], vencimento_fonte: '', observacoes: ['SEM_VENCIMENTO'],
  };
  delete nota.arquivo;
  delete nota.valor_documento;
  const plano = planejarRegistro(pacote, { notas: [nota], linha_propria: null }, CONTEXTO);
  assert.equal(JSON.stringify(plano).includes('12345678909'), false);
  assert.equal(plano.notas[0].linha.prestador_documento, '***.456.789-**');
  assert.equal(plano.notas[0].linha.status, 'Revisão');
  assert.equal(plano.notas[0].linha.motivos, '[PRESTADOR_PESSOA_FISICA] Nota emitida por CPF, fora do padrão de fornecedor PJ.');
  assert.equal(plano.notas[0].linha.observacoes, '[SEM_VENCIMENTO] Sem vencimento: confira o boleto ou combine a data com o fornecedor.');
  assert.equal(plano.etiqueta, 'NF/revisao');
});

test('nota substituta avisa a original que está na planilha', () => {
  const { pacote, consolidado } = cenarioT01();
  consolidado.notas[0].chave_nota_substituida = CHAVE_B;
  const linhasNotas = [{ id: 'orig0001', chave_duplicidade: CHAVE_B, numero: '1100', origem_id: 'm0', prestador_documento: '11222333000181', observacoes: '' }];
  const plano = planejarRegistro(pacote, consolidado, { ...CONTEXTO, linhasNotas });
  assert.deepEqual(plano.atualizacoes, [{ chave_duplicidade: CHAVE_B, observacoes: 'Substituída pela nota 1201' }]);
  assert.equal(plano.notas[0].linha.motivos, '[NOTA_SUBSTITUTA] Substitui a nota 1100; confira se a original já foi aprovada ou paga.');
  const linhas = montarLinhas(plano, {}, { agora: 'x', linkExecucao: 'y' });
  assert.deepEqual(linhas.notas.at(-1), { chave_duplicidade: CHAVE_B, observacoes: 'Substituída pela nota 1201' });
});

test('linha própria de revisão usa a chave da origem e a pasta _Revisao', () => {
  const pacote = pacoteBase({ anexos: [{ chave: 'z', tipo: 'outro', nome: 'notas.zip', mime: 'application/zip', hash: 'hz' }] });
  const plano = planejarRegistro(pacote, { notas: [], linha_propria: { motivos: ['ARQUIVO_NAO_SUPORTADO'], arquivos_ligados: [{ chave: 'z', tipo: 'anexo' }] } }, CONTEXTO);
  assert.equal(plano.notas[0].chave_duplicidade, 'origem:msg-1');
  assert.equal(plano.notas[0].id, sha256('origem:msg-1').slice(0, 8));
  assert.equal(plano.notas[0].linha.status, 'Revisão');
  assert.equal(plano.notas[0].linha.motivos, '[ARQUIVO_NAO_SUPORTADO] Anexo em formato não aceito (ex.: .zip).');
  assert.deepEqual(plano.arquivos.map((a) => [a.nome, a.pasta.join('/')]), [['msg-1_notas.zip', '_Revisao/2026-09']]);
  assert.equal(plano.etiqueta, 'NF/revisao');
});

test('envio pelo formulário não tem etiqueta e registra quem enviou', () => {
  const { pacote, consolidado } = cenarioT01({ origem: 'formulario', origem_id: 'form-abc', message_id: null, enviado_por: 'fin@exemplo.com' });
  const plano = planejarRegistro(pacote, consolidado, CONTEXTO);
  assert.equal(plano.etiqueta, null);
  assert.equal(plano.notas[0].linha.origem, 'Formulário');
  assert.equal(plano.notas[0].linha.enviado_por, 'fin@exemplo.com');
});

test('planoSemLeitura para duplicata de arquivo e para retomada total', () => {
  const duplicata = planoSemLeitura({ acao: 'duplicata_arquivo', origem: 'email', origem_id: 'm2', message_id: 'm2', recebido_em: '2026-09-15 10:00', empresa: { apelido: 'Colmeia' }, nota_id_existente: 'abcd1234', numero_existente: '1201' });
  assert.deepEqual(duplicata.ocorrencias, [{ tipo: 'DUPLICATA_ARQUIVO', origem_id: 'm2', nota_id: 'abcd1234', descricao: 'Arquivos já registrados para a Colmeia (nota 1201); nenhuma leitura feita.' }]);
  assert.equal(duplicata.etiqueta, 'NF/duplicada');
  assert.deepEqual(duplicata.resultado, [{ situacao: 'duplicata', id: 'abcd1234', numero: '1201', status: '', motivos: '' }]);
  const retomada = planoSemLeitura({ acao: 'retomada_total', origem: 'formulario', origem_id: 'form-1', message_id: null, recebido_em: 'x', etiqueta: null, notas_existentes: [{ id: 'abcd1234', numero: '1201', status: 'Extraída', motivos: '' }] });
  assert.deepEqual(retomada.resultado, [{ situacao: 'ja_registrada', id: 'abcd1234', numero: '1201', status: 'Extraída', motivos: '' }]);
  assert.equal(retomada.etiqueta, null);
  assert.deepEqual(retomada.arquivos, []);
});

test('montarLinhas grava ocorrências com data e link da execução', () => {
  const { pacote, consolidado } = cenarioT01();
  const linhasNotas = [{ id: '00aa11bb', chave_duplicidade: CHAVE_A, origem_id: 'outro-email', numero: '1201', prestador_documento: '11222333000181' }];
  const plano = planejarRegistro(pacote, consolidado, { ...CONTEXTO, linhasNotas });
  const linhas = montarLinhas(plano, {}, { agora: '2026-09-15 10:05', linkExecucao: 'http://n8n/exec/1' });
  assert.deepEqual(linhas.ocorrencias, [{ data_hora: '2026-09-15 10:05', tipo: 'DUPLICATA_NOTA', origem_id: 'msg-1', nota_id: '00aa11bb', descricao: 'Nota 1201 da Colmeia já registrada; não foi gravada de novo.', link_execucao: 'http://n8n/exec/1' }]);
  assert.deepEqual(linhas.notas, []);
  assert.deepEqual(linhas.arquivos, []);
});
