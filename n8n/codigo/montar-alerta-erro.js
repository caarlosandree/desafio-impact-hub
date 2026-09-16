// @libs alertas
const CONFIG = __CONFIG__;
const alerta = alertaErrorWorkflow($input.first().json);
return [{ json: { ...alerta, para: CONFIG.emails_alerta, de: CONFIG.remetente_alertas } }];
