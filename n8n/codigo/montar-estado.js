// @libs linhas
const nomes = Object.fromEntries($('Etiquetas (estado)').all().map((item) => [item.json.id, item.json.name]));
const assuntoDe = (email) => email.subject
  ?? ((email.payload && email.payload.headers) || []).find((cabecalho) => String(cabecalho.name).toLowerCase() === 'subject')?.value
  ?? '';
const emails = $('E-mails de teste').all()
  .map((item) => item.json)
  .filter((email) => email.id && assuntoDe(email).startsWith('[T'))
  .map((email) => ({ id: email.id, assunto: assuntoDe(email), etiquetas: (email.labelIds ?? []).map((id) => nomes[id] ?? id) }));
return [{
  json: {
    notas: linhasValidas($('Notas (estado)').all().map((item) => item.json)),
    arquivos: linhasValidas($('Arquivos (estado)').all().map((item) => item.json)),
    ocorrencias: linhasValidas($('Ocorrências (estado)').all().map((item) => item.json)),
    emails,
  },
}];
