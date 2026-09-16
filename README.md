# Notas fiscais de fornecedores PJ com n8n

Desafio técnico para a vaga de Analista de IA e Produtos Digitais. Automatiza a recepção, a leitura, a conferência e o registro de notas fiscais de fornecedores de um grupo com três empresas, usando n8n, Google Workspace e Gemini.

O documento principal da entrega é [`docs/entrega/0-LEIA-ME.md`](docs/entrega/0-LEIA-ME.md): premissas, uso de IA, resultado dos testes e limitações.

## O que o fluxo faz

- **Três entradas:** caixas do Gmail, formulário autenticado do n8n e uma varredura de hora em hora que recolhe o que ficou sem etiqueta.
- **Leitura:** XML da NFS-e nacional lido direto; PDF, PDF escaneado e foto lidos pelo Gemini, com resposta em formato fechado.
- **Conferência:** 16 regras determinísticas (CNPJ, tomador, valores, datas, eventos, formato) e duplicidade por hash do arquivo e por chave da nota.
- **Registro:** linha na planilha (Extraída ou Revisão com o motivo), arquivos no Drive com nomes sem dado pessoal e etiqueta no e-mail.
- **Falhas:** tratamento dentro do fluxo (etiqueta `NF/erro`, ocorrência e alerta) e um Error Workflow para o que escapar; sinal de vida diário.

## Estrutura

| Pasta | Conteúdo |
|---|---|
| `docs/entrega/` | LEIA-ME, desenho da solução, guia do financeiro, instruções de importação e roteiros do vídeo |
| `docs/superpowers/` | Especificação e plano de implementação |
| `src/lib/` | Regras de negócio em JavaScript puro, testadas fora do n8n |
| `n8n/` | Definição dos workflows em código, código dos nodes e configuração de exemplo |
| `scripts/` | Geração dos workflows, implantação local, bateria de testes, PDFs e pacote da entrega |
| `testdata/` | Gerador das notas, boletos e documentos fictícios da bateria |
| `testes/` | Tabela de execução da bateria e teste de injeção de instruções |
| `infra/` | `docker-compose.yml` do n8n 2.38.7 e modelo do `.env` |

## Como rodar

```bash
npm install
npm test                 # testes das regras de negócio
npm run construir        # gera os workflows em n8n/workflows/
npm run gerar:dados      # gera os documentos fictícios (rodar no dia da bateria)
npm run bateria -- --limpar A B T19 T20 T21 T26 T22
npm run gerar:docs       # PDFs da entrega
npm run entrega          # monta a pasta entrega/ e confere se há segredos
```

A implantação numa instância limpa do n8n está descrita em [`docs/entrega/2-fluxo-n8n-LEIA-ME.md`](docs/entrega/2-fluxo-n8n-LEIA-ME.md). Os segredos ficam em `infra/.env` (modelo em `infra/.env.exemplo`) e nunca são versionados.

## Dados

Todos os documentos de teste são fictícios, marcados como "DOCUMENTO FICTÍCIO — SEM VALOR FISCAL", com CNPJs conferidos como inexistentes. As empresas do cenário também são fictícias.
