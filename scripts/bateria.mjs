import './env.mjs';
import { execFileSync } from 'node:child_process';
import { appendFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { RAIZ_PROJETO } from './env.mjs';
import { estado, limpar, reprocessar } from './apoio.mjs';
import { enviarCaso } from './enviar-caso.mjs';
import { enviarFormulario } from './formulario.mjs';
import { CASOS, contextoDoEmail } from '../testdata/casos.mjs';
import { diasAPartirDeHoje } from '../testdata/dados.mjs';

const TABELA = path.join(RAIZ_PROJETO, 'testes/execucao.md');
const esperar = (ms) => new Promise((resolver) => setTimeout(resolver, ms));
const agora = () => new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
const rodar = (comando, argumentos) => execFileSync(comando, argumentos, { cwd: RAIZ_PROJETO, stdio: 'inherit' });
const caso = (id) => CASOS.find((item) => item.id === id);

function registrar(id, obtido, falhas) {
  mkdirSync(path.dirname(TABELA), { recursive: true });
  if (!existsSync(TABELA)) {
    writeFileSync(TABELA, '# Tabela de execução da bateria de testes\n\n| Data e hora | Caso | Resultado obtido | Situação |\n|---|---|---|---|\n');
  }
  const situacao = falhas.length ? `falhou: ${falhas.join('; ')}` : 'ok';
  appendFileSync(TABELA, `| ${agora()} | ${id} | ${obtido.replace(/\|/g, '/')} | ${situacao.replace(/\|/g, '/')} |\n`);
  console.log(`${id}: ${situacao}`);
}

function resumir(ctx) {
  const notas = ctx.notas.length
    ? ctx.notas.map((n) => `${n.numero || 'sem nota'}: ${n.status}${n.motivos ? ` (${[...String(n.motivos).matchAll(/\[(\w+)\]/g)].map((m) => m[1]).join(', ')})` : ''}`).join('; ')
    : 'nenhuma linha';
  const ocorrencias = ctx.ocorrencias.length ? ` · ocorrências: ${ctx.ocorrencias.map((o) => o.tipo).join(', ')}` : '';
  return `${notas}${ocorrencias} · etiquetas: ${ctx.etiquetas.join(', ') || 'nenhuma'}`;
}

async function aguardarEtiqueta(id, etiqueta = null, limiteMin = 15) {
  const fim = Date.now() + limiteMin * 60000;
  while (Date.now() < fim) {
    const atual = await estado();
    const ctx = contextoDoEmail(atual, id);
    if (ctx.etiquetas.length && (!etiqueta || ctx.etiquetas.includes(etiqueta))) return { atual, ctx };
    await esperar(30000); // a cota de leitura do Google Planilhas é de 60 chamadas por minuto
  }
  throw new Error(`${id}: sem etiqueta ${etiqueta ?? 'NF/*'} depois de ${limiteMin} minutos`);
}

async function rodarGrupo(grupo) {
  const casos = CASOS.filter((item) => item.grupo === grupo);
  for (let inicio = 0; inicio < casos.length; inicio += 5) {
    const lote = casos.slice(inicio, inicio + 5);
    for (const item of lote) await enviarCaso(item);
    console.log(`Lote enviado: ${lote.map((item) => item.id).join(', ')}`);
    for (const item of lote) {
      try {
        const { ctx } = await aguardarEtiqueta(item.id);
        await esperar(3000);
        const atual = await estado();
        const ctxFinal = contextoDoEmail(atual, item.id);
        registrar(item.id, resumir(ctxFinal), item.conferir(ctxFinal, atual));
      } catch (erro) {
        registrar(item.id, 'sem resultado', [erro.message]);
      }
    }
  }
}

const implantarCom = (...ajustes) => {
  rodar('node', ['scripts/configurar-local.mjs', ...ajustes]);
  rodar('bash', ['scripts/implantar.sh']);
};

const PROCEDIMENTOS = {
  async T19() {
    rodar('node', ['scripts/importar-credenciais.mjs', '--gemini=invalida']);
    await enviarCaso(caso('T19'));
    const { ctx } = await aguardarEtiqueta('T19', 'NF/erro');
    const falhas = [];
    if (!ctx.ocorrencias.some((o) => o.tipo === 'ERRO_TECNICO')) falhas.push('sem ocorrência ERRO_TECNICO');
    if (ctx.notas.length) falhas.push('gravou linha apesar do erro');
    rodar('node', ['scripts/importar-credenciais.mjs', '--gemini=valida']);
    await reprocessar('[T19]');
    const depois = await aguardarEtiqueta('T19', 'NF/processada', 15);
    if (!(depois.ctx.notas.length === 1 && depois.ctx.notas[0].status === 'Extraída')) falhas.push(`após reprocessar: ${resumir(depois.ctx)}`);
    registrar('T19', `1ª: ${resumir(ctx)} → após corrigir e tirar NF/erro: ${resumir(depois.ctx)} · confirmar alerta no e-mail de alertas`, falhas);
  },
  async T20() {
    implantarCom('simular_falha_registro=true');
    await enviarCaso(caso('T20'));
    const { ctx } = await aguardarEtiqueta('T20', 'NF/erro');
    const falhas = [];
    if (ctx.notas.length !== 1) falhas.push(`1ª execução deveria gravar a linha: ${ctx.notas.length}`);
    if (ctx.arquivos.length) falhas.push('1ª execução gravou hashes');
    implantarCom('simular_falha_registro=false');
    await reprocessar('[T20]');
    const depois = await aguardarEtiqueta('T20', 'NF/processada', 15);
    if (depois.ctx.arquivos.length !== 2) falhas.push(`hashes após reprocessar: ${depois.ctx.arquivos.length}`);
    if (depois.ctx.ocorrencias.some((o) => o.tipo === 'DUPLICATA_NOTA')) falhas.push('acusou DUPLICATA_NOTA na retomada');
    if (depois.ctx.notas.length !== 1) falhas.push(`linhas após reprocessar: ${depois.ctx.notas.length}`);
    registrar('T20', `1ª: ${resumir(ctx)} → reprocessado: ${resumir(depois.ctx)}`, falhas);
  },
  async T21() {
    const vencimento = diasAPartirDeHoje(20);
    const texto = await enviarFormulario({ empresa: 'Trampolim', arquivos: ['danfse-3400-n3400.pdf'], vencimento, observacao: 'Nota baixada do portal da prefeitura.' });
    const atual = await estado();
    const nota = atual.notas.find((linha) => String(linha.numero) === '3400');
    const falhas = [];
    if (!texto.includes('Nota 3400: registrada como Extraída.')) falhas.push(`página: ${texto.slice(0, 200)}`);
    if (nota?.origem !== 'Formulário') falhas.push(`origem ${nota?.origem}`);
    if (nota?.vencimento !== vencimento || nota?.vencimento_fonte !== 'Formulário') falhas.push(`vencimento ${nota?.vencimento}/${nota?.vencimento_fonte}`);
    if (!nota?.enviado_por) falhas.push('enviado_por vazio');
    registrar('T21', `página: "${texto.replace(/\s+/g, ' ').slice(0, 120)}" · linha: ${nota?.status}, ${nota?.origem}, ${nota?.vencimento_fonte}, enviado_por ${nota?.enviado_por}`, falhas);
  },
  async T26() {
    implantarCom('simular_falha_registro=true');
    const primeiro = await enviarFormulario({ empresa: 'Maré', arquivos: ['nfse-480-n480.xml'] });
    let atual = await estado();
    const falhas = [];
    const linha = atual.notas.find((item) => String(item.numero) === '480');
    if (!primeiro.includes('falha técnica')) falhas.push(`1ª página: ${primeiro.slice(0, 200)}`);
    if (!linha) falhas.push('1º envio não gravou a linha');
    if (!atual.ocorrencias.some((o) => o.tipo === 'ERRO_TECNICO' && String(o.origem_id) === String(linha?.origem_id))) falhas.push('sem ERRO_TECNICO do formulário');
    implantarCom('simular_falha_registro=false');
    const segundo = await enviarFormulario({ empresa: 'Maré', arquivos: ['nfse-480-n480.xml'] });
    atual = await estado();
    if (!segundo.includes('Nota 480: já estava registrada')) falhas.push(`2ª página: ${segundo.slice(0, 200)}`);
    if (atual.arquivos.filter((a) => String(a.origem_id) === String(linha?.origem_id)).length !== 1) falhas.push('hash não gravado no reenvio');
    if (atual.ocorrencias.some((o) => o.tipo === 'DUPLICATA_NOTA' && String(o.origem_id) === String(linha?.origem_id))) falhas.push('acusou DUPLICATA_NOTA no reenvio');
    registrar('T26', `1º envio: "${primeiro.replace(/\s+/g, ' ').slice(0, 90)}" → reenvio: "${segundo.replace(/\s+/g, ' ').slice(0, 90)}"`, falhas);
  },
  async T22() {
    rodar('docker', ['exec', 'nf-n8n', 'n8n', 'unpublish:workflow', '--id=NFrecepcaoExtr01']);
    rodar('docker', ['restart', 'nf-n8n']);
    await esperar(20000);
    await enviarCaso(caso('T22'));
    console.log('T22 enviado com o fluxo parado; aguardando 6 minutos para passar da idade mínima…');
    await esperar(6 * 60000);
    const hora = Number(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo', hour: 'numeric', hourCycle: 'h23' }));
    implantarCom(`sinal_de_vida_hora=${hora}`);
    const { ctx } = await aguardarEtiqueta('T22', 'NF/processada', 12);
    const falhas = ctx.notas.length === 1 ? [] : [`linhas ${ctx.notas.length}`];
    implantarCom('sinal_de_vida_hora=8');
    registrar('T22', `${resumir(ctx)} · confirmar no e-mail de alertas o "[NF] Sinal de vida" com as contagens`, falhas);
  },
};

const argumentos = process.argv.slice(2);
if (argumentos.includes('--limpar')) {
  await limpar();
  console.log('Planilha e e-mails de teste limpos.');
}
for (const alvo of argumentos.filter((argumento) => argumento !== '--limpar')) {
  if (alvo === 'A' || alvo === 'B') await rodarGrupo(alvo);
  else if (PROCEDIMENTOS[alvo]) await PROCEDIMENTOS[alvo]();
  else {
    const item = caso(alvo);
    if (!item?.conferir) throw new Error(`Caso desconhecido ou sem conferência automática: ${alvo}`);
    await enviarCaso(item);
    const { atual, ctx } = await aguardarEtiqueta(alvo);
    registrar(alvo, resumir(ctx), item.conferir(ctx, atual));
  }
}
