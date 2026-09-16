// @libs triagem
const config = $('Configuração').first().json.config;
return $input.all().map((item) => ({ json: triarAnexos(item.json, config) }));
