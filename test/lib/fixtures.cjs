const CHAVE_A = `3550308${'11222333000181'}${'0'.repeat(28)}1`;
const CHAVE_B = `3550308${'11222333000181'}${'0'.repeat(28)}2`;

function xmlNfseSimples({ chave = CHAVE_A, numero = '1201', tomador = '12ABC34501DE35', vServ = '1500.00', vLiq = '1500.00' } = {}) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<NFSe xmlns="http://www.sped.fazenda.gov.br/nfse" versao="1.01"><infNFSe Id="NFS${chave}">
<nNFSe>${numero}</nNFSe><dhProc>2026-09-10T10:00:00-03:00</dhProc>
<emit><CNPJ>11222333000181</CNPJ><xNome>Ateliê Bromélia Design Ltda.</xNome></emit>
<valores><vTotalRet>0.00</vTotalRet><vLiq>${vLiq}</vLiq></valores>
<DPS><infDPS><dCompet>2026-09-01</dCompet><toma><CNPJ>${tomador}</CNPJ><xNome>Colmeia Espaços Colaborativos Ltda.</xNome></toma>
<serv><cServ><xDescServ>Design gráfico</xDescServ></cServ></serv><valores><vServPrest><vServ>${vServ}</vServ></vServPrest></valores></infDPS></DPS>
</infNFSe></NFSe>`;
}

function pacoteBase(sobrescrever = {}) {
  return {
    origem: 'email', origem_id: 'msg-1', message_id: 'msg-1', recebido_em: '2026-09-15 10:00',
    destinatarios: ['desafioimphub+colmeia@gmail.com'], empresa_escolhida: null,
    empresa: { apelido: 'Colmeia', nome: 'Colmeia Espaços Colaborativos Ltda.', cnpj: '12ABC34501DE35' },
    corpo_texto: '', vencimento_informado: null, enviado_por: '', anexos: [], motivos_pacote: [], ignorados: [], motivos_arquivo: [],
    ...sobrescrever,
  };
}

function documentoIa(sobrescrever = {}) {
  return {
    tipo: 'nfse', arquivo: null, numero: null, chave_acesso: null, data_emissao: null, competencia: null,
    prestador_documento: null, prestador_nome: null, tomador_cnpj: null, tomador_nome: null, descricao_servico: null,
    valor_servico: null, retencoes_total: null, valor_liquido: null, valor_documento: null,
    chave_nota_substituida: null, vencimento: null, vencimento_trecho: null,
    ...sobrescrever,
  };
}

module.exports = { CHAVE_A, CHAVE_B, xmlNfseSimples, pacoteBase, documentoIa };
