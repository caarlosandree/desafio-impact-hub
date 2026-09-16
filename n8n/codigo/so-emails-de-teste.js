// Só os e-mails da bateria de testes: o assunto começa com "[T".
// A busca do Gmail ignora colchetes, então o filtro tem de ser feito aqui.
const assuntoDe = (email) => email.subject
  ?? ((email.payload && email.payload.headers) || []).find((cabecalho) => String(cabecalho.name).toLowerCase() === 'subject')?.value
  ?? '';
return $input.all()
  .filter((item) => item.json.id && assuntoDe(item.json).startsWith('[T'))
  .map((item) => ({ json: { id: item.json.id, assunto: assuntoDe(item.json) } }));
