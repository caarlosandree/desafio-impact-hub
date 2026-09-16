// @libs alertas linhas
const config = $('Configuração').first().json.config;
const emails = $('Contar e-mails pendentes').all().map((item) => item.json);
const notas = $('Ler revisões abertas').all().map((item) => item.json);
const ocorrencias = $('Ler ocorrências recentes').all().map((item) => item.json);
const agora = new Date();
const falhaGmail = emails.some((item) => item.error);
const falhaPlanilha = notas.some((item) => item.error) || ocorrencias.some((item) => item.error);
const falhas = [];
if (falhaGmail) falhas.push('o Gmail');
if (falhaPlanilha) falhas.push('a planilha');
const sinal = textoSinalDeVida({
  agora,
  pendentes: falhaGmail ? null : emails.filter((item) => item.id).length,
  revisoes: falhaPlanilha ? null : linhasValidas(notas).filter((linha) => linha.status === 'Revisão').length,
  errosTecnicos: falhaPlanilha ? null : contarErrosRecentes(ocorrencias, agora),
  falhas,
});
return [{ json: { ...sinal, para: config.emails_alerta, de: config.remetente_alertas } }];
