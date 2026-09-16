# Como importar o fluxo numa instância limpa do n8n 2.38.7

## Conteúdo desta pasta

- `NF-recepcao-e-extracao.json` — workflow principal (id `NFrecepcaoExtr01`)
- `NF-erros.json` — Error Workflow (id `NFerrosAlerta001`)
- `docker-compose.yml` — n8n 2.38.7 com as variáveis usadas
- `credenciais-modelo.json` — as 5 credenciais com os ids esperados pelos workflows, **sem nenhum segredo**
- `planilha-modelo.xlsx` — abas Notas, Arquivos, Ocorrências, Empresas, Fornecedores e Centros de custo

## Passo a passo

1. `docker compose up -d` e crie a conta de dono em `http://localhost:5678`.
2. No Google Cloud: ative Gmail API, Google Drive API e Google Sheets API e crie um cliente OAuth (aplicativo da Web) com o redirecionamento `http://localhost:5678/rest/oauth2-credential/callback`.
3. No Gmail da conta técnica, crie as etiquetas `NF/processada`, `NF/revisao`, `NF/duplicada` e `NF/erro`.
4. No Drive, crie a pasta `NF` e, dentro dela, uma pasta para cada apelido da aba Empresas e a pasta `_Revisao`.
5. Suba `planilha-modelo.xlsx` no Drive, salve como Planilhas Google e ajuste a aba **Empresas** (endereços e CNPJs reais das caixas).
6. Importe as credenciais sem segredo e os workflows (no terminal, dentro desta pasta):

       docker cp credenciais-modelo.json nf-n8n:/tmp/
       docker exec nf-n8n n8n import:credentials --input=/tmp/credenciais-modelo.json
       docker cp NF-erros.json nf-n8n:/tmp/
       docker cp NF-recepcao-e-extracao.json nf-n8n:/tmp/
       docker exec nf-n8n n8n import:workflow --input=/tmp/NF-erros.json
       docker exec nf-n8n n8n import:workflow --input=/tmp/NF-recepcao-e-extracao.json

7. Em **Credentials**, preencha as 5 credenciais: Client ID e Secret nas três do Google (e clique em *Sign in with Google*), a chave do Gemini em `NF · Gemini API` (header `x-goog-api-key`) e o SMTP com senha de app em `NF · SMTP alertas`.
8. Abra o workflow `NF · Recepção e extração`, node **Configuração**, e preencha `planilha_id`, `pasta_raiz_id`, `emails_alerta` (fora da caixa técnica), `remetente_alertas` e `n8n_url`.
9. Em Settings → Users, convide como *Member* as pessoas do financeiro que usarão o formulário.
10. Publique os dois workflows (botão **Publish**). O formulário fica em `{n8n_url}/form/nf-envio`.
11. Em produção, deixe o n8n acessível só por HTTPS (proxy reverso com TLS), use uma conta técnica do Workspace com app OAuth **interno** e a chave do Gemini do plano **pago**, e peça a validação da encarregada de dados antes de ligar.

## Como o código está organizado

Os nodes Code contêm as bibliotecas de regras embutidas (cabeçalhos `// ----- src/lib/… -----`). O repositório de origem mantém essas regras em arquivos separados com testes automatizados e gera os JSON com `npm run construir:entrega`. Para mudar uma regra, altere a biblioteca, rode os testes e gere de novo; não edite o código dentro do node.
