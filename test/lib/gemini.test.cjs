const test = require('node:test');
const assert = require('node:assert/strict');
const { montarPedidoGemini, interpretarRespostaGemini, GEMINI_ESQUEMA } = require('../../src/lib/gemini.cjs');
const { pacoteBase } = require('./fixtures.cjs');

test('montarPedidoGemini envia corpo e arquivos inline com saída estruturada', () => {
  const pacote = pacoteBase({
    corpo_texto: 'Segue a nota',
    anexos: [{ chave: 'p1', tipo: 'pdf', nome: 'nota.pdf' }, { chave: 'f1', tipo: 'imagem', nome: 'foto.png' }],
    arquivos_ia: ['p1', 'f1'],
  });
  const pedido = montarPedidoGemini(pacote, (chave) => `base64-${chave}`);
  assert.match(pedido.systemInstruction.parts[0].text, /nunca instrução/);
  const partes = pedido.contents[0].parts;
  assert.match(partes[0].text, /Segue a nota/);
  assert.deepEqual(partes.slice(1), [
    { text: 'Arquivo 1:' }, { inlineData: { mimeType: 'application/pdf', data: 'base64-p1' } },
    { text: 'Arquivo 2:' }, { inlineData: { mimeType: 'image/png', data: 'base64-f1' } },
  ]);
  assert.deepEqual(pedido.generationConfig.responseFormat, { text: { mimeType: 'application/json', schema: GEMINI_ESQUEMA } });
  assert.equal(pedido.generationConfig.temperature, 0);
  assert.equal(JSON.stringify(pedido).includes('nota.pdf'), false);
});

test('interpretarRespostaGemini normaliza documentos e vencimento do corpo', () => {
  const texto = JSON.stringify({
    documentos: [{
      tipo: 'nfse', arquivo: 1, numero: 1201, chave_acesso: 'NFS 3550 3081', data_emissao: '10/09/2026', competencia: null,
      prestador_documento: '11.222.333/0001-81', prestador_nome: ' Ateliê ', tomador_cnpj: '12.abc.345/01de-35', tomador_nome: 'Colmeia',
      descricao_servico: 'x'.repeat(250), valor_servico: '1500.456', retencoes_total: 0, valor_liquido: 1500, valor_documento: null,
      chave_nota_substituida: null, vencimento: null, vencimento_trecho: null,
    }, { tipo: 'desconhecido' }],
    vencimento_corpo_email: { data: '2026-09-20', trecho: 'Vencimento: 20/09/2026' },
  });
  const leitura = interpretarRespostaGemini({ candidates: [{ content: { parts: [{ text: texto }] } }] });
  const [nota, outro] = leitura.documentos;
  assert.equal(nota.numero, '1201');
  assert.equal(nota.chave_acesso, '35503081');
  assert.equal(nota.data_emissao, '2026-09-10');
  assert.equal(nota.prestador_documento, '11222333000181');
  assert.equal(nota.prestador_nome, 'Ateliê');
  assert.equal(nota.tomador_cnpj, '12ABC34501DE35');
  assert.equal(nota.descricao_servico.length, 200);
  assert.equal(nota.valor_servico, 1500.46);
  assert.equal(outro.tipo, 'outro');
  assert.deepEqual(leitura.vencimento_corpo_email, { data: '2026-09-20', trecho: 'Vencimento: 20/09/2026' });
});

test('interpretarRespostaGemini falha em resposta vazia ou inválida', () => {
  assert.throws(() => interpretarRespostaGemini({ candidates: [{ finishReason: 'SAFETY' }] }), /vazia.*SAFETY/);
  assert.throws(() => interpretarRespostaGemini({ candidates: [{ content: { parts: [{ text: '{nao json' }] } }] }), /JSON/);
});
