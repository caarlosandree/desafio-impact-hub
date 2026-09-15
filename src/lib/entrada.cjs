const { htmlParaTexto, somenteAlfanumericos, truncar } = require('./texto.cjs'); // @node-only
const { dataHoraSaoPaulo, normalizarData } = require('./datas.cjs'); // @node-only

const LIMITE_CORPO_EMAIL = 5000;

function enderecosDaMensagem(mensagem) {
  const enderecos = [];
  for (const campo of [mensagem.to, mensagem.cc]) {
    for (const item of campo?.value ?? []) {
      if (item.address) enderecos.push(String(item.address).trim().toLowerCase());
      for (const membro of item.group ?? []) {
        if (membro.address) enderecos.push(String(membro.address).trim().toLowerCase());
      }
    }
  }
  return [...new Set(enderecos)];
}

function padronizarEmail(mensagem, anexos) {
  const corpo = String(mensagem.text ?? '').trim() || htmlParaTexto(mensagem.html);
  return {
    origem: 'email',
    origem_id: String(mensagem.id),
    message_id: String(mensagem.id),
    recebido_em: dataHoraSaoPaulo(mensagem.date ?? Date.now()),
    destinatarios: enderecosDaMensagem(mensagem),
    empresa_escolhida: null,
    empresa: null,
    corpo_texto: truncar(corpo, LIMITE_CORPO_EMAIL),
    vencimento_informado: null,
    enviado_por: '',
    anexos,
    motivos_pacote: [],
  };
}

function campoDoFormulario(envio, ...nomes) {
  for (const nome of nomes) {
    if (envio[nome] !== undefined && envio[nome] !== null) return envio[nome];
  }
  return '';
}

function padronizarFormulario(envio, anexos, sha256) {
  const empresa = String(campoDoFormulario(envio, 'empresa', 'Empresa')).trim();
  const hashes = anexos.map((anexo) => anexo.hash).sort();
  return {
    origem: 'formulario',
    origem_id: `form-${sha256([empresa, ...hashes].join('|')).slice(0, 16)}`,
    message_id: null,
    recebido_em: dataHoraSaoPaulo(envio.submittedAt ?? Date.now()),
    destinatarios: [],
    empresa_escolhida: empresa,
    empresa: null,
    corpo_texto: truncar(String(campoDoFormulario(envio, 'observacao', 'Observação')).trim(), LIMITE_CORPO_EMAIL),
    vencimento_informado: normalizarData(campoDoFormulario(envio, 'vencimento', 'Vencimento') || null),
    enviado_por: envio.user?.email ?? '',
    anexos,
    motivos_pacote: [],
  };
}

function resolverEmpresa(pacote, linhasEmpresas) {
  const empresas = (linhasEmpresas ?? []).filter((linha) => linha && linha.apelido);
  const encontrada = pacote.origem === 'formulario'
    ? empresas.find((empresa) => String(empresa.apelido).trim() === pacote.empresa_escolhida)
    : empresas.find((empresa) => pacote.destinatarios.includes(String(empresa.endereco_destino ?? '').trim().toLowerCase()));
  if (!encontrada) {
    return { ...pacote, empresa: null, motivos_pacote: [...new Set([...pacote.motivos_pacote, 'EMPRESA_DESCONHECIDA'])] };
  }
  return {
    ...pacote,
    empresa: {
      apelido: String(encontrada.apelido).trim(),
      nome: String(encontrada.empresa ?? '').trim(),
      cnpj: somenteAlfanumericos(encontrada.cnpj),
    },
  };
}

module.exports = { padronizarEmail, padronizarFormulario, resolverEmpresa }; // @node-only
