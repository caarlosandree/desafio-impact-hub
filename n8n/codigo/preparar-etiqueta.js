const dados = $('Montar linhas').first().json;
if (!dados.message_id || !dados.etiqueta) return [{ json: { _vazio: true } }];
return [{ json: { message_id: dados.message_id, etiqueta_id: $('Retomar entrada').first().json.etiquetas_ids[dados.etiqueta] } }];
