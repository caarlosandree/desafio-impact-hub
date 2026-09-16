// @libs drive
const plano = $('Plano de registro').first().json;
const config = $('Configuração').first().json.config;
const resultado = planejarPastas(plano, $input.all().map((item) => item.json), config.pasta_raiz_id);
if (!resultado.pastas_criar.length) return [{ json: { ...resultado, criar: false } }];
return resultado.pastas_criar.map((pasta) => ({ json: { ...resultado, criar: true, nome: pasta.nome, pai_id: pasta.pai_id } }));
