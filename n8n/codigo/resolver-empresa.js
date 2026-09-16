// @libs entrada
const empresas = $('Ler empresas').all().map((item) => item.json);
return $input.all().map((item) => {
  const { config, etiquetas_ids, ...pacote } = item.json;
  return { json: resolverEmpresa(pacote, empresas) };
});
