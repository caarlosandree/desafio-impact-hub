// Parâmetros do fluxo de notas fiscais. O dono técnico altera só os valores abaixo.
const CONFIG = __CONFIG__;
return $input.all().map((item) => ({ json: { ...item.json, config: CONFIG } }));
