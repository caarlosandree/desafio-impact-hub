const falha = $('Falha técnica').first().json;
return [{ json: { origem: falha.origem, origem_id: falha.origem_id, falha: true, resultado: [] } }];
