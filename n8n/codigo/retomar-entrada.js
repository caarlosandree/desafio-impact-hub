// @libs gmail
const etiquetas_ids = mapearEtiquetas($('Listar etiquetas').all().map((item) => item.json));
return $('Configuração').all().map((item) => ({ json: { ...item.json, etiquetas_ids } }));
