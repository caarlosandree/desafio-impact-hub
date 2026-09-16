const dados = $('Montar linhas').first().json;
return [{ json: { origem: dados.origem, origem_id: dados.origem_id, falha: false, resultado: dados.resultado } }];
