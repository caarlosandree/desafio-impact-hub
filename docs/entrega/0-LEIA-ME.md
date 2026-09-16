# Desafio técnico — Notas fiscais de fornecedores PJ

*Carlos · Vaga Pessoa Analista de IA e Produtos Digitais · Entrega de 16/09/2026*

## O que tem nesta pasta

| Ordem de leitura | Arquivo | Conteúdo |
|---|---|---|
| 1 | `0-LEIA-ME.pdf` | Este índice, premissas, uso de IA e experiência prévia |
| 2 | `1-desenho-da-solucao.pdf` | Desenho de ponta a ponta em 2 páginas: fluxo, ferramentas, responsáveis, riscos e falhas |
| 3 | `3-video.mp4` | 3 minutos com o fluxo rodando: caso normal, PDF escaneado, tomador errado, duplicata e erro técnico |
| 4 | `4-documentacao-trecho-1.pdf` | Guia do financeiro: rotina, formulário e plano de contingência |
| 5 | `2-fluxo-n8n/` | Os 2 workflows exportados, `docker-compose.yml`, planilha modelo e instruções de importação |
| 6 | `5-notas-de-teste/` | Arquivos fictícios da bateria, tabela de execução e teste de injeção de instruções |

## O que foi implementado

O trecho 1 completo, da chegada do e-mail ao registro da nota: três entradas (Gmail, formulário autenticado e varredura horária), leitura direta do XML nacional, leitura de PDF e imagem com Gemini, 16 regras de validação, duplicidade por hash do arquivo e por chave da nota, registro em Planilhas, Drive e etiquetas, tratamento de falha em duas camadas e sinal de vida diário. Os trechos 2 (aprovação no WhatsApp) e 3 (visibilidade) estão desenhados.

**Resultado da bateria:** preencher com o número final de `testes/execucao.md`, no formato "26 de 26 casos da spec aprovados, mais o teste de injeção e o do Error Workflow".

## Premissas (resumo)

- **Empresas fictícias:** Colmeia Espaços Colaborativos (coworking, ~110 notas/mês), Trampolim Inclusão Produtiva (~60) e Maré Eventos de Impacto (~30). A holding e a quarta iniciativa não recebem notas diretamente, o que explica 3 caixas para 4 empresas.
- **Volume:** ~200 notas/mês, 70% entre os dias 1 e 10; ~120 fornecedores, muitos MEI (por isso há nomes de pessoas nas notas).
- **Formato:** NFS-e no Padrão Nacional (obrigatório desde 01/01/2026), mas ainda chegam XML municipal, só PDF, PDF escaneado, foto e link de portal. NF-e de produto é exceção e vai para revisão.
- **O que a nota não traz:** vencimento (vem do boleto, do e-mail ou, no trecho 2, do prazo padrão do fornecedor) e centro de custo (vem do cadastro de fornecedores). O fluxo nunca inventa data.
- **Pessoas:** financeiro com 2 pessoas; ~10 centros de custo com gestor e substituto; o analista de IA é o dono técnico, com substituto treinado; a encarregada de dados valida antes de produção.
- **Ferramentas do grupo:** Google Workspace. n8n self-hosted como orquestrador.
- **Fora do escopo:** o pagamento em si, integração com ERP e tratamento de NF-e de produto.

## Como usei IA

- **Pesquisa com checagem em fonte oficial.** Campos e caminhos do XML da NFS-e nacional (NT 008), CNPJ alfanumérico (vetor oficial da Receita), termos de uso do Gemini (plano gratuito × pago), preços e termos do WhatsApp, e a exigência de ativação em servidor de licenças da Evolution API. Cada fato usado no desenho tem fonte citada na especificação.
- **Brainstorming e especificação.** A IA propôs alternativas; as decisões (n8n, planilha como painel, WhatsApp oficial, descarte da Evolution API) foram minhas, registradas com o motivo.
- **Código.** Gerado com IA, revisado e coberto por testes automatizados: as regras de negócio ficam em bibliotecas testadas fora do n8n (mais de 100 testes) e são embutidas nos nodes na hora de gerar o workflow. Os parâmetros dos nodes foram conferidos no código-fonte da própria versão 2.38.7.
- **Dados de teste.** Notas, boletos, DANFE, versões escaneadas, foto e PDFs protegidos gerados por script, todos com a marca "DOCUMENTO FICTÍCIO — SEM VALOR FISCAL" e CNPJs conferidos como inexistentes.
- **IA dentro do produto, sempre cercada.** O Gemini só lê o que o XML não resolve, responde num formato fechado, não tem acesso a ferramentas e trata o conteúdo como dado. Regras determinísticas (CNPJ, tomador, valores, datas, duplicidade) conferem tudo o que ele devolve, e a aprovação do gestor no trecho 2 é a última barreira. O teste de injeção de instruções está em `5-notas-de-teste/teste-de-injecao.md`.

## Experiência prévia com o mesmo problema

Desenvolvi e mantenho o DocSend, uma plataforma de gestão documental e operação contábil em produção (Java, Spring Boot, Next.js, PostgreSQL). Ela já faz, em escala, várias etapas deste desafio: leitura de documentos fiscais com IA de vários provedores e OCR para arquivos escaneados, leitura de XML de NF-e e NFS-e, fluxo de aprovação e reprovação com motivo, notificações, trilha de auditoria e recursos de LGPD.

Para este cenário, faltaria acrescentar a leitura das caixas de e-mail, o módulo de contas a pagar e a aprovação pelo WhatsApp.

Mesmo assim, escolhi o n8n para a entrega: é gratuito, o fluxo pode ser exportado e mantido sem depender de um desenvolvedor, e é mais simples para a equipe operar. Se o volume ou a complexidade crescerem, o DocSend é um caminho de evolução possível. Posso demonstrá-lo numa conversa.

## Limitações conhecidas

- Demonstração com Gmail pessoal de teste e app OAuth em modo de teste (a autorização expira em 7 dias). Em produção: conta técnica do Workspace e app interno.
- A chave do Gemini da demonstração é do **plano gratuito**: o projeto do Google Cloud onde ela foi criada não tem conta de faturamento vinculada. No plano gratuito o Google pode usar os comandos e as respostas para treinar seus modelos; por isso a demonstração usa só documentos fictícios. Em produção, só o plano pago, em que esse uso não acontece.
- A planilha não tem trava de unicidade: a proteção vem do processamento em sequência, das checagens antes de gravar e das colunas técnicas protegidas.
