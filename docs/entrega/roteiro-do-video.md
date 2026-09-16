# Roteiro do vídeo (até 3 minutos)

## Preparação (antes de gravar)

1. `node scripts/bateria.mjs --limpar` para zerar planilha e e-mails de teste.
2. Deixar abertas, lado a lado: caixa do Gmail de teste, planilha na aba Notas (filtro desligado), pasta `NF` do Drive e a caixa de alertas.
3. Deixar `bash scripts/implantar.sh` rodado e `n8n/config.local.json` com `gmail_minutos: 1`.
4. Gravar a tela em 1920×1080 com o QuickTime (Arquivo → Nova gravação de tela), microfone ligado.
5. Enviar T01, T03 e T08 **30 segundos antes** de começar a gravar: `node scripts/enviar-caso.mjs T01 T03 T08`.

## Cenas

| Tempo | Cena | O que mostrar e falar |
|---|---|---|
| 0:00–0:15 | Problema | "Notas chegam em três caixas, são lançadas à mão e se perdem. Este fluxo lê, confere e registra sozinho." |
| 0:15–1:00 | Caso normal (T01) | E-mail com XML, PDF e boleto → etiqueta `NF/processada` → linha **Extraída** com vencimento do boleto e o trecho → 3 arquivos no Drive com nomes sem dado pessoal. |
| 1:00–1:30 | PDF escaneado (T03) | Linha lida pela IA; destacar `vencimento_trecho` com o texto do e-mail. |
| 1:30–1:55 | Tomador errado (T08) | Linha **Revisão** com "[TOMADOR_DIVERGENTE] Nota emitida para Trampolim…, não para a Colmeia…". |
| 1:55–2:15 | Duplicata (T13) | `node scripts/enviar-caso.mjs T13` gravado antes e cortado: etiqueta `NF/duplicada` e ocorrência `DUPLICATA_ARQUIVO`, sem linha nova e sem chamar a IA. |
| 2:15–2:50 | Erro técnico (T19) | Chave inválida → `NF/erro`, ocorrência e alerta no e-mail → corrigir a chave → tirar a etiqueta → linha **Extraída** (cortar a espera). |
| 2:50–3:00 | Documentação | Mostrar a pasta pública: desenho, guia do financeiro e fluxo exportado. |

Exportar como `entrega/3-video.mp4` (H.264). Se passar de 3:00, encurtar as falas das cenas 2 e 6.
