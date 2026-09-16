const campo = '__CAMPO__';
if (campo === 'arquivos' && $('Configuração').first().json.config.simular_falha_registro) {
  throw new Error('Falha simulada na gravação dos hashes (simular_falha_registro ligado para teste).');
}
const linhas = $('Montar linhas').first().json[campo];
return linhas.length ? linhas.map((linha) => ({ json: linha })) : [{ json: { _vazio: true } }];
