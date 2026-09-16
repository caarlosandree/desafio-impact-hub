// @libs linhas
const nomes = Object.fromEntries($('Etiquetas (estado)').all().map((item) => [item.json.id, item.json.name]));
const emails = $('E-mails de teste').all()
  .map((item) => item.json)
  .filter((email) => email.id)
  .map((email) => ({ id: email.id, assunto: email.subject ?? '', etiquetas: (email.labelIds ?? []).map((id) => nomes[id] ?? id) }));
return [{
  json: {
    notas: linhasValidas($('Notas (estado)').all().map((item) => item.json)),
    arquivos: linhasValidas($('Arquivos (estado)').all().map((item) => item.json)),
    ocorrencias: linhasValidas($('Ocorrências (estado)').all().map((item) => item.json)),
    emails,
  },
}];
