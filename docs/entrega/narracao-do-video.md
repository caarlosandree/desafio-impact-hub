# Narração do vídeo (2:40)

Falas usadas no `3-video.mp4`. A narração foi gerada com o Gemini TTS (voz Charon) a partir desta tabela; a seção "Como gravar" vale para quem quiser gravar com voz própria sobre o vídeo sem áudio. Cada bloco abaixo tem o tempo em que as imagens aparecem e uma fala que cabe nele num ritmo tranquilo. Pode mudar as palavras à vontade; o que importa é terminar cada bloco antes da virada de cena.

## Como gravar

1. Abra `video-mudo.mp4` no QuickTime e deixe a janela à vista.
2. Em outra janela do QuickTime: **Arquivo → Nova gravação de áudio**, microfone interno ou fone, qualidade máxima.
3. Clique em gravar no áudio e, logo em seguida, dê play no vídeo. Leia acompanhando as imagens.
4. Pare a gravação quando o vídeo terminar e salve como `narracao.m4a` nesta pasta.
5. Me avise. Eu junto áudio e vídeo em `entrega/3-video.mp4`, e compenso algum segundo de atraso no início se precisar.

## Falas

| Tempo | Na tela | Fala |
|---|---|---|
| 0:00–0:15 | O fluxo inteiro no n8n e os três gatilhos | "As notas dos fornecedores chegam por três caixas de e-mail e hoje são lançadas à mão. Este fluxo no n8n recebe as notas pelo Gmail, por um formulário e por uma varredura de hora em hora, e lê, confere e registra cada uma sozinho." |
| 0:15–0:48 | T01: e-mail com XML, PDF e boleto → planilha → Drive | "Primeiro, o caso normal. O fornecedor manda o XML, o PDF e o boleto, e o e-mail recebe a etiqueta NF barra processada. Na planilha, a nota 1201 entra como Extraída, com os valores lidos direto do XML. O vencimento, 26 de setembro, veio do boleto, e a planilha guarda o trecho de onde a data saiu. Os três arquivos vão para o Drive, na pasta da empresa e do mês, com nomes sem nenhum dado pessoal." |
| 0:48–1:10 | T03: PDF escaneado e "Pagamento até 06/10/2026" | "Agora, um PDF escaneado, sem XML. Quem lê é o Gemini, sempre num formato fechado. O vencimento não estava na nota: veio do corpo do e-mail, 'pagamento até 6 de outubro'. A planilha mostra o trecho e registra que a leitura foi feita pela IA." |
| 1:10–1:23 | T08: motivo TOMADOR_DIVERGENTE | "Esta nota foi emitida para a Trampolim, mas chegou na caixa da Colmeia. As regras conferem tudo o que foi lido, e a linha vai para Revisão com o motivo escrito por extenso." |
| 1:23–1:39 | T13: e-mail com NF/duplicada e ocorrência DUPLICATA_ARQUIVO | "Se o mesmo e-mail chega de novo, os arquivos já estão registrados. O e-mail recebe NF barra duplicada, nada é gravado outra vez e a IA nem é chamada. Fica só a ocorrência na planilha." |
| 1:39–2:08 | T19: alerta, ocorrência ERRO_TECNICO, e-mail processado, nota 470 | "E quando algo quebra? Aqui a chave do Gemini estava inválida. O e-mail ficou com NF barra erro, o responsável técnico recebeu um alerta dizendo onde parou e o que fazer, e a ocorrência ficou registrada. Depois de corrigir a chave, basta tirar a etiqueta: o fluxo reprocessa e a nota 470 entra como Extraída, sem duplicar nada." |
| 2:08–2:36 | Desenho, guia do financeiro e pasta da entrega | "Na pasta da entrega estão o desenho da solução em duas páginas, o guia do financeiro com a rotina e o plano de contingência, os workflows exportados com o docker-compose e a planilha modelo, e as notas fictícias com a tabela da bateria: vinte e seis de vinte e seis casos aprovados." |
