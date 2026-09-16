# Guia do financeiro — Notas fiscais de fornecedores

*Versão 1 · Trecho 1: recepção e leitura das notas · Nomes e contatos deste guia são fictícios.*

## 1. Para que serve

Toda nota fiscal que um fornecedor manda para as caixas de e-mail da Colmeia, da Trampolim ou da Maré é lida automaticamente e vira uma linha na planilha **Contas a pagar · NF**. Os arquivos ficam guardados no Drive e o e-mail ganha uma etiqueta que diz o que aconteceu com ele.

Você não precisa mais baixar PDF nem digitar número, valor e vencimento. Seu trabalho passa a ser **conferir as notas que o sistema separou para revisão**.

## 2. Como funciona, em 5 passos

1. **O e-mail chega.** Uma cópia vai para a caixa técnica. A cada 5 minutos o sistema procura e-mails novos.
2. **O sistema lê a nota.** Se o fornecedor mandou o XML, os dados saem direto dele. Se mandou só PDF ou foto, uma inteligência artificial lê o documento. Ela também procura o vencimento no boleto e no texto do e-mail.
3. **O sistema confere.** Verifica se o CNPJ é válido, se a nota foi emitida para a empresa certa, se valores e datas fazem sentido.
4. **O sistema evita repetição.** Se o mesmo arquivo ou a mesma nota já foi registrada, ela não entra de novo.
5. **O sistema registra.** Grava a linha na planilha, guarda os arquivos no Drive e coloca uma etiqueta no e-mail.

| Etiqueta no e-mail | O que significa |
|---|---|
| `NF/processada` | Nota registrada sem problemas (status **Extraída**). |
| `NF/revisao` | Nota registrada, mas precisa da sua conferência (status **Revisão**). |
| `NF/duplicada` | Nota ou arquivo que já estava registrado. Nada foi gravado de novo. |
| `NF/erro` | O sistema não conseguiu terminar. O responsável técnico já foi avisado. |
| (sem etiqueta) | Ainda não foi processado. Normal nos primeiros minutos. |

## 3. Rotina diária (10 a 20 minutos)

1. Abra a planilha **Contas a pagar · NF**, aba **Notas**.
2. Filtre a coluna **status** por **Revisão** e a coluna **revisado_em** por **vazio**. Essa é a sua fila do dia.
3. Para cada linha, leia a coluna **motivos**. Cada motivo começa com um código entre colchetes, como `[TOMADOR_DIVERGENTE]`. Procure o código na tabela abaixo e faça o que ela diz.
4. Para ver o documento, clique no link da coluna **arquivos**.
5. Quando terminar a linha:
   - se era uma nota e você corrigiu o que faltava: preencha **revisado_por** (seu nome) e **revisado_em** (a data) e mude o **status** para **Extraída**;
   - se a linha não tem nota (coluna **numero** vazia) e você resolveu por outro caminho, por exemplo reenviando pelo formulário: preencha **revisado_por** e **revisado_em** e deixe o status como está.
6. Veja também a coluna **observacoes** das notas **Extraída**: avisos como `[SEM_VENCIMENTO]` não bloqueiam a nota, mas pedem um olhar.

**Nunca altere** as colunas `id`, `chave_duplicidade` e `origem_id`, nem a aba **Arquivos**. Elas são usadas pelo sistema para evitar notas repetidas.

### O que fazer com cada motivo

| Código | O que aconteceu | O que fazer |
|---|---|---|
| `SEM_ANEXO` | O e-mail não tinha arquivo aproveitável (às vezes só um link de portal). | Abra o e-mail na caixa técnica (etiqueta `NF/revisao`), baixe a nota pelo link e envie pelo formulário (seção 4). |
| `ARQUIVO_NAO_SUPORTADO` | Veio um formato que o sistema não lê, como `.zip`. | Abra o arquivo pelo link, descompacte no computador e envie os PDFs ou XML pelo formulário. |
| `ARQUIVO_ILEGIVEL` | PDF com senha para abrir ou corrompido. | Peça ao fornecedor um PDF sem senha e envie pelo formulário. |
| `XML_NAO_RECONHECIDO` | XML de modelo municipal antigo, sem PDF junto. | Peça o PDF da nota ao fornecedor (ou baixe no portal) e envie pelo formulário. |
| `NOTA_NAO_ENCONTRADA` | Havia arquivo, mas nenhuma nota fiscal (por exemplo, só o boleto). | Confira o anexo pelo link. Peça a nota ao fornecedor. |
| `EMPRESA_DESCONHECIDA` | O e-mail foi para um endereço que não está na aba **Empresas**. | Confira se a despesa é do grupo. Se for, preencha a coluna **empresa**. Se o endereço for novo e correto, peça ao responsável técnico para incluí-lo na aba **Empresas**. |
| `EVENTO_NFSE` | Chegou um aviso de cancelamento de nota, não uma nota. | Procure a nota original na planilha pelo número e escreva "Cancelada" em **observacoes**. Se ela já foi aprovada ou paga, avise a coordenação. |
| `NFE_PRODUTO` | É nota de produto (NF-e com DANFE), fora deste fluxo. | Encaminhe para o processo de compras de sempre. |
| `CAMPO_FALTANDO` | O sistema não conseguiu ler algum dado. | Abra o PDF pelo link e preencha os campos citados no motivo. |
| `CNPJ_INVALIDO` | O CNPJ lido não passa na conferência dos dígitos. | Compare com o PDF. Se a leitura errou, corrija. Se o documento está errado, peça nota corrigida ao fornecedor. |
| `PRESTADOR_PESSOA_FISICA` | A nota foi emitida por CPF, e o grupo contrata como PJ. | Consulte a coordenação antes de seguir. O CPF aparece mascarado de propósito: não copie o número completo para a planilha. |
| `TOMADOR_DIVERGENTE` | A nota foi emitida para outra empresa do grupo. | Se o fornecedor só mandou para a caixa errada, corrija a coluna **empresa**. Se a nota está em nome errado, peça a substituição. |
| `VALOR_INCOERENTE` | Valor zerado, negativo ou líquido maior que o bruto. | Compare com o PDF e corrija. Se o documento está errado, peça nota corrigida. |
| `DATA_INCOERENTE` | Emissão no futuro ou com mais de 180 dias. | Confira a data. Nota antiga pode já ter sido paga: procure pelo número na planilha. |
| `VENCIMENTO_INCOERENTE` | Vencimento antes da emissão ou mais de 120 dias depois. | Confira o boleto e, se preciso, combine a data com o fornecedor. |
| `NOTA_SUBSTITUTA` | A nota substitui outra. A original recebe o aviso "Substituída pela nota…". | Se a original ainda não foi aprovada nem paga, siga com a nova e escreva "Cancelada por substituição" na original. Se já foi paga, chame a coordenação. |
| `SEM_VENCIMENTO` (observação) | Não havia vencimento no boleto, no e-mail nem na nota. | Preencha o **vencimento** quando souber. O sistema nunca inventa data. |

## 4. Como enviar uma nota pelo formulário

Use quando a nota não chegou por e-mail: baixada de um portal, recebida por outro canal, ou reenviada depois de uma revisão.

1. Acesse o endereço do formulário (está nos favoritos do navegador do financeiro) e entre com o seu usuário. Na primeira vez, o n8n pergunta se o formulário pode rodar com o seu login ("wants to run using your n8n login"): clique em **Allow access**.
2. Escolha a **Empresa**.
3. Em **Arquivos da nota**, selecione o PDF, o XML ou a foto. Pode mandar mais de um arquivo, inclusive o boleto.
4. Se souber o vencimento, preencha **Vencimento**. Ele vale para todas as notas do envio.
5. Clique em **Enviar** e espere a página final. Ela mostra, para cada nota, se foi registrada como **Extraída**, se foi para **Revisão** (com o motivo) ou se já estava registrada.
6. Se aparecer "falha técnica", tente de novo mais tarde **com os mesmos arquivos**. Nada será duplicado.

## 5. Plano de contingência

**Regra principal:** durante uma falha, **não lance notas à mão** na planilha. Os e-mails esperam na caixa e são processados quando o sistema voltar. Lançar à mão cria linhas que o sistema não reconhece como a mesma nota.

| Sintoma | O que fazer | Quem chamar |
|---|---|---|
| Um e-mail está com a etiqueta `NF/erro`. | Nada: o responsável técnico já recebeu um alerta. Se o vencimento for em até 3 dias úteis, avise-o por mensagem. | Responsável técnico |
| E-mails de nota sem nenhuma etiqueta há mais de 2 horas (em horário comercial). | Avise o responsável técnico. Não lance à mão. | Responsável técnico |
| O formulário não abre. | O sistema pode estar parado. Avise o responsável técnico e tente mais tarde. | Responsável técnico |
| O formulário mostra "falha técnica". | Tente de novo mais tarde com os mesmos arquivos. Se repetir, avise. | Responsável técnico |
| A leitura de uma nota saiu errada (valor, número, data). | Corrija a linha e anote em **observacoes** o que corrigiu. Se o erro se repetir com o mesmo fornecedor, avise. | Responsável técnico |
| Uma linha foi apagada ou uma coluna técnica foi alterada por engano. | Não tente consertar. Use Arquivo → Histórico de versões para ver o que mudou e avise. | Responsável técnico |
| Pagamento urgente com o sistema parado há mais de 1 dia útil. | Com autorização da coordenação, pague pelo processo manual e, quando o sistema voltar, envie a nota pelo formulário para ela ficar registrada. | Coordenação financeira |

## 6. Do que o sistema depende

| Serviço | Para quê | Se parar |
|---|---|---|
| Gmail (caixa técnica) | Receber as notas e marcar etiquetas | E-mails esperam; nada se perde. |
| Google Planilhas | Guardar as linhas das notas | O sistema para e avisa o responsável técnico. |
| Google Drive (pasta `NF`) | Guardar PDFs e XML | Idem. |
| n8n | O "motor" que faz a leitura e o registro | E-mails esperam; o formulário não abre. |
| Gemini (inteligência artificial do Google) | Ler PDFs e fotos | Notas só em PDF ficam com `NF/erro` até voltar. Notas com XML continuam entrando. |
| Conta técnica do Google | Dá acesso às três ferramentas do Google | O sistema para e avisa. |

## 7. Responsáveis e contatos

| Papel | Responsabilidade | Contato (fictício) |
|---|---|---|
| Analista de contas a pagar | Trata a fila de revisão todo dia; envia notas pelo formulário. | ana.pagar@grupo-exemplo.com.br |
| Coordenação financeira | Dona do processo; aprova mudanças de regra e de acesso. | coordenacao.fin@grupo-exemplo.com.br |
| Analista de IA (responsável técnico) | Recebe alertas; mantém o sistema; cria acessos ao formulário. | analista.ia@grupo-exemplo.com.br |
| Substituto técnico | Cobre férias e ausências do responsável técnico. | substituto.ia@grupo-exemplo.com.br |
| Encarregada de dados | Valida o uso de dados pessoais antes de qualquer mudança. | dpo@grupo-exemplo.com.br |

## 8. Glossário

- **XML:** arquivo da nota em formato de dados. É a fonte mais confiável: quando ele vem, a leitura é exata.
- **DANFSe:** o PDF "bonito" da nota de serviço. Serve para pessoas lerem.
- **Etiqueta:** marcação colorida do Gmail que diz o que aconteceu com o e-mail.
- **Reprocessar:** pedir ao sistema que tente de novo. Num e-mail com `NF/erro`, é o responsável técnico quem faz isso tirando a etiqueta. No formulário, basta enviar de novo os mesmos arquivos.
- **Duplicata:** nota ou arquivo que já estava registrado. O sistema não grava de novo e deixa o registro na aba **Ocorrências**.
- **Revisão:** nota registrada que precisa de conferência humana antes de seguir.
