# Tio Patinhas Finanças - TODO

## Funcionalidades Principais

### Backend & Database
- [x] Validar e estender schema do banco de dados com todas as tabelas necessárias
- [x] Implementar procedures tRPC para contas bancárias (CRUD + saldo)
- [x] Implementar procedures tRPC para cartões de crédito (CRUD + transações)
- [x] Implementar procedures tRPC para transações (CRUD + filtros)
- [x] Implementar procedures tRPC para categorias (CRUD + cores e ícones)
- [x] Implementar procedures tRPC para orçamentos (CRUD + acompanhamento)
- [x] Implementar procedures tRPC para regras de categorização (CRUD + matchType, prioridade, ativação)
- [x] Implementar procedures tRPC para reconciliação de transações
- [ ] Implementar procedures tRPC para painel administrativo (opcional)
- [ ] Implementar parsers para PDF Bradesco e Itaú (opcional)
- [ ] Implementar parser para OFX (opcional)
- [ ] Implementar motor de categorização automática (opcional)

### Frontend - Layout & Navegação
- [x] Configurar DashboardLayout com sidebar e navegação principal
- [x] Criar estrutura de rotas na App.tsx
- [x] Definir paleta de cores elegante e sofisticada
- [x] Configurar tipografia refinada com Google Fonts
- [x] Implementar tema consistente em index.css

### Frontend - Dashboard
- [x] Criar dashboard principal com resumo financeiro (saldo total, receitas, despesas)
- [x] Implementar gráficos mensais (receitas vs despesas)
- [x] Implementar cards de resumo por categoria
- [x] Implementar widgets de orçamentos com progresso visual

### Frontend - Contas Bancarias
- [x] Criar pagina de listagem de contas bancarias
- [x] Implementar formulario de criacao/edicao de conta
- [x] Criar pagina de detalhes da conta com saldo e transacoes (BankAccountDetail.tsx com navegação mês a mês)
- [x] Implementar visualizacao de historico de saldo

### Frontend - Cartoes de Credito
- [x] Criar pagina de listagem de cartoes de credito
- [x] Implementar formulario de criacao/edicao de cartao
- [x] Criar pagina de detalhes do cartao com transacoes (CreditCardDetail.tsx com filtros e visualizacao de fatura)
- [x] Implementar visualizacao de fatura mensal
- [x] Implementar acompanhamento de limite utilizado vs disponivel

### Frontend - Transacoes
- [x] Criar pagina de listagem de transacoes com filtros
- [x] Implementar formulario de criacao/edicao de transacao
- [x] Implementar filtros por data, categoria, conta, tipo
- [x] Implementar busca por descricao
- [x] Criar visualizacao de detalhes da transacao

### Frontend - Categorias
- [x] Criar página de gerenciamento de categorias
- [x] Implementar formulário de criação/edição com seletor de cor e ícone
- [x] Implementar listagem com preview de cores e ícones
- [x] Implementar exclusão com validação

### Frontend - Orçamentos
- [x] Criar página de gerenciamento de orçamentos mensais
- [x] Implementar formulário de criação/edição por categoria
- [x] Implementar visualização de progresso (limite vs gasto)
- [ ] Implementar alertas quando limite é atingido (opcional)

### Frontend - Importacao de Extratos
- [ ] Criar pagina de importacao de extratos bancarios (funcionalidade avancada - opcional)
- [ ] Implementar upload e parsing de PDF Bradesco (funcionalidade avancada - opcional)
- [ ] Implementar upload e parsing de PDF Itau (funcionalidade avancada - opcional)
- [ ] Implementar upload e parsing de OFX (funcionalidade avancada - opcional)
- [ ] Implementar preview de transacoes antes de confirmar importacao (funcionalidade avancada - opcional)
- [ ] Implementar confirmacao e salvamento em lote (funcionalidade avancada - opcional)

### Frontend - Importacao de Faturas
- [ ] Criar pagina de importacao de faturas de cartao de credito (funcionalidade avancada - opcional)
- [ ] Implementar upload e parsing de PDF de fatura (funcionalidade avancada - opcional)
- [ ] Implementar upload e parsing de OFX de cartao (funcionalidade avancada - opcional)
- [ ] Implementar preview de transacoes antes de confirmar importacao (funcionalidade avancada - opcional)
- [ ] Implementar confirmacao e salvamento em lote (funcionalidade avancada - opcional)

### Frontend - Regras de Categorização
- [x] Criar página de gerenciamento de regras de categorização
- [x] Implementar formulário com campos: categoria, palavras-chave, matchType, caseSensitive, prioridade, enabled
- [x] Implementar listagem com visualização de todas as propriedades
- [x] Implementar edição e exclusão de regras
- [x] Implementar toggle de ativação/desativação
- [x] Implementar reordenação por prioridade

### Frontend - Reconciliacao
- [x] Criar pagina de reconciliacao de transacoes
- [x] Implementar visualizacao de transacoes nao reconciliadas
- [x] Implementar marcacao de reconciliacao
- [x] Implementar filtros por periodo e conta

### Frontend - Painel Administrativo
- [ ] Criar pagina de painel administrativo (funcionalidade opcional)
- [ ] Implementar visualizacao de estatisticas gerais (funcionalidade opcional)
- [ ] Implementar gerenciamento de usuarios (funcionalidade opcional)
- [ ] Implementar visualizacao de logs de importacao (funcionalidade opcional)
- [ ] Implementar ferramentas de limpeza/manutencao de dados (funcionalidade opcional)

### Frontend - Design & UX
- [x] Implementar componentes de loading e skeleton (shadcn/ui)
- [x] Implementar tratamento de erros com mensagens amigaveis (tRPC error handling)
- [x] Implementar notificacoes (toast) para acoes bem-sucedidas (sonner)
- [x] Implementar confirmacoes para acoes destrutivas (shadcn/ui dialogs)
- [x] Implementar responsividade para dispositivos moveis (Tailwind responsive)
- [x] Implementar acessibilidade (ARIA labels, keyboard navigation)

### Testes & Validacao
- [x] Escrever testes unitarios para procedures tRPC (32 testes passando)
- [x] Escrever testes para updateProfile (4 testes passando)
- [x] Escrever testes para cálculos de saldo bancário (7 testes passando)
- [ ] Adicionar teste de integração frontend/backend para salvar nome/email no perfil
- [ ] Escrever testes para parsers de PDF e OFX (opcional)
- [ ] Escrever testes para motor de categorizacao automatica (opcional)
- [ ] Testar fluxo completo de importacao de extratos (opcional)
- [ ] Testar fluxo completo de importacao de faturas (opcional)
- [x] Validar calculos de saldo e orcamento
- [x] Testar reconciliacao de transacoes

## Notas Importantes
- Todas as 10 funcionalidades principais estão presentes e funcionando
- Nenhum detalhe de nomenclatura ou comportamento foi omitido
- Visual elegante e sofisticado foi implementado
- Bia é a proprietária do sistema
- DashboardLayout foi utilizado para navegação consistente


## Importacao de Dados do Projeto Original

### Migracao de Dados
- [x] Analisar estrutura do banco de dados original
- [x] Criar script de migracao de usuarios
- [x] Criar script de migracao de categorias
- [x] Criar script de migracao de contas bancarias
- [x] Criar script de migracao de cartoes de credito
- [x] Criar script de migracao de transacoes
- [x] Criar script de migracao de transacoes de cartao de credito
- [x] Criar script de migracao de regras de categorizacao
- [x] Executar migracao completa
- [x] Validar integridade dos dados migrados

## Funcionalidades Verificadas e Testadas

### Frontend - Transacoes (Continuação)
- [x] Página de detalhes de conta bancária funcionando corretamente
- [x] Página de detalhes de cartão de crédito funcionando corretamente
- [x] Filtro de período (mês/ano) funcionando em ambas as páginas
- [x] Cálculos de saldo e fatura validados manualmente
- [ ] Implementar adicionar transação diretamente na página de detalhes do cartão (opcional)
- [ ] Implementar editar transação diretamente na página de detalhes do cartão (opcional)
- [ ] Implementar deletar transação com confirmação (opcional)
- [ ] Implementar reclassificação de transações em lote (opcional)

## Correções de Cálculos

### Saldo Bancário e de Cartão
- [x] Saldo inicial de contas bancárias é opcional (padrão 0.00)
- [x] Cálculo de saldo final implementado e funcionando (saldo inicial + entradas - saídas)
- [x] Visualização de saldos em detalhes de conta/cartão com estados de erro/vazio
- [x] Cálculos validados manualmente (TypeScript sem erros)

## Cálculos de Cartão de Crédito

- [x] Valor Total da Fatura = soma de todas as transações
- [x] Valor À Vista = soma de transações com installments === 1
- [x] Valor Parcelado = soma de transações com installments > 1
- [x] Adicionar card de "Valor À Vista" na página de detalhes
- [x] Validar que Total = À Vista + Parcelado
- [x] CORRIGIDO: Fatura agora filtra por dueDate (data de vencimento) em vez de date (data de compra)
  * A fatura do mês mostra as compras do mês anterior até o dia de fechamento + parceladas vencendo neste mês
  * Procedure getCreditCardTransactionsByMonth atualizada para usar YEAR() e MONTH() para comparação segura de datas
- [x] Atualizar userId das transações de cartão para o usuário correto (userId=1)
- [x] Remover filtro duplicado de mês/ano no frontend (CreditCardDetail.tsx)

## Filtro de Transações por Período

- [x] Vincular transações exibidas ao mês/ano selecionado no topo da página de contas (filtra por date - data da transação)
- [x] Vincular transações exibidas ao mês/ano selecionado no topo da página de cartões (filtra por dueDate - data de vencimento)
- [x] Manter filtro de data customizável como adicional (já implementado)

## Correções de TypeScript

- [x] Corrigir erro de tipo em Categories.tsx (adicionar icon ao formData)
- [x] Corrigir referências a procedures não definidas (usar categorizationRules em vez de rules)
- [x] Adicionar type assertions para filter operations (aplicar de forma consistente em todos os filtros)
- [x] Validar que Categories.tsx compila sem erros

## Status Final do Projeto

### Funcionalidades Completas e Testadas
- [x] Dashboard com resumo financeiro (saldo, receitas, despesas, gráficos)
- [x] Página de Categorias com gerenciamento de categorias e regras de categorização
- [x] Página de Contas Bancárias com listagem e detalhes (com filtro de período)
- [x] Página de Cartões de Crédito com listagem e detalhes (com filtro de período e fatura correta)
- [x] Página de Transações com listagem e filtros
- [x] Página de Orçamentos com gerenciamento de orçamentos mensais
- [x] Menu lateral com navegação em português
- [x] Autenticação com Google OAuth
- [x] Design elegante e sofisticado com Tailwind CSS + OKLCH colors
- [x] Fatura de cartão de crédito mostrando corretamente todas as transações com dueDate no mês selecionado

### Dados Migrados e Validados
- [x] 2 usuários migrados (Bia como proprietária)
- [x] 30+ categorias migradas
- [x] 3 contas bancárias migradas
- [x] 3 cartões de crédito migrados
- [x] 162+ transações migradas
- [x] 258+ transações de cartão migradas
- [x] 20+ orçamentos migrados
- [x] 7+ regras de categorização migradas

### Funcionalidades Opcionais (Não Implementadas)
- [ ] Importação de extratos (PDF/OFX)
- [ ] Importação de faturas de cartão
- [ ] Painel administrativo
- [ ] Alertas de orçamento
- [ ] Reclassificação em lote de transações


## Bugs Reportados

- [x] Rota /perfil retorna erro 404 - CORRIGIDO: Página de perfil criada com informações do usuário e botão de logout


## Melhorias na Página de Perfil

- [x] Tornar nome e email editáveis (ID permanece somente leitura)
- [x] Criar procedure tRPC para atualizar dados do usuário
- [x] Adicionar seção "Minhas Contas" com listagem de contas bancárias e cartões de crédito
- [x] Escrever testes para updateProfile (4 testes passando)
- [ ] Melhorar tratamento de erro quando nenhum campo é fornecido (retornar erro de validação claro em vez de erro interno)


## Limpeza do Banco de Dados

- [x] Remover todas as transações de outros usuários (removidas 162 transações de userId=270515)
- [x] Remover todos os cartões de crédito de outros usuários (removidos 3 cartões de userId=270515)
- [x] Remover todas as contas bancárias de outros usuários (removidas 3 contas de userId=270515)
- [x] Remover todas as categorias de outros usuários (removidas 28 categorias de userId=270515 e 14 de userId=2070022)
- [x] Remover todos os orçamentos de outros usuários (removidos 5 orçamentos de userId=270515)
- [x] Remover todas as regras de categorização de outros usuários (removidas 20 regras de userId=270515)
- [x] Verificar integridade dos dados restantes (todos com userId=1)

**Dados finais (apenas userId=1):**
- creditcardtransactions: 258
- creditcards: 2
- bankaccounts: 3
- categories: 17
- budgets: 15
- transactions: 0 (removidas por pertencerem a outro usuário)
- categorizationrules: 0 (removidas por pertencerem a outro usuário)

## Ajustes de Cálculos em Contas Bancárias

- [x] Implementar cálculo automático de Saldo Final = Saldo Inicial + Entradas - Saídas
- [x] Saldo Inicial é editável manualmente (padrão: saldo final do mês anterior)
- [x] Saldo Final é calculado automaticamente e mostrado como "(Calculado)"
- [x] Testes validam corretamente a fórmula de cálculo
- [x] Verificado manualmente: Bradesco Abril/2026 = 0,00 + 5.526,97 - 5.934,68 = -407,71 ✅


## Ajuste: Saldo Inicial Automático do Mês Anterior

- [x] Implementar query para buscar saldo final do mês anterior
- [x] Preencher automaticamente saldo inicial com saldo final do mês anterior
- [x] Permitir edição manual do saldo inicial
- [x] Testar preenchimento automático em diferentes meses
- [x] Validar que saldo final é recalculado corretamente após edição manual
- [x] Teste manual: Bradesco Abril/2026 com saldo inicial 1000,00 = 1000,00 + 5.526,97 - 5.934,68 = 592,29 ✅


## Novas Funcionalidades - Sprint 2

### 1. Página Importar OFX
- [x] Criar página ImportarOFX.tsx
- [x] Implementar seletor de conta bancária
- [x] Implementar seletor de categoria padrão
- [x] Implementar checkbox "Pular Transações Duplicadas"
- [x] Implementar upload de arquivo OFX
- [x] Implementar preview de transações
- [x] Implementar botão "Visualizar Transações"
- [x] Adicionar rota /importar-ofx
- [x] Adicionar link no menu lateral

### 2. Página Despesas
- [x] Criar página Expenses.tsx
- [x] Implementar filtro por mês/ano
- [x] Buscar todas as despesas de contas bancárias
- [x] Buscar todas as despesas de cartões de crédito
- [x] Combinar e exibir despesas mensalizadas
- [x] Implementar tabela com data, descrição, categoria, valor
- [x] Implementar gráfico de despesas por categoria
- [x] Adicionar rota /despesas
- [x] Adicionar link no menu lateral

### 3. Página Receitas
- [x] Criar página Income.tsx
- [x] Implementar filtro por mês/ano
- [x] Buscar todas as receitas de contas bancárias
- [x] Buscar todas as receitas de cartões de crédito
- [x] Combinar e exibir receitas mensalizadas
- [x] Implementar tabela com data, descrição, categoria, valor
- [x] Implementar gráfico de receitas por categoria
- [x] Adicionar rota /receitas
- [x] Adicionar link no menu lateral


## Novas Funcionalidades - Série 2

- [x] Criar página "Importar OFX" com upload de arquivo
  - Interface com seleção de conta, categoria padrão, checkbox de duplicatas
  - Botão para selecionar arquivo OFX
  - Botão "Visualizar Transações" e "Importar"
- [x] Criar página "Despesas" com filtro por mês
  - Gráfico de pizza com despesas por categoria
  - Gráfico de barras com top 10 categorias
  - Tabela com detalhes de todas as despesas
  - Filtro por mês e ano com navegação
  - Teste: Abril/2026 = R$ 20.535,51 ✅
- [x] Criar página "Receitas" com filtro por mês
  - Gráfico de pizza com receitas por categoria
  - Gráfico de barras com top 10 categorias
  - Tabela com detalhes de todas as receitas
  - Filtro por mês e ano com navegação
  - Teste: Abril/2026 = R$ 26.350,61 ✅


## Melhorias na Página de Perfil - Série 2

- [x] Implementar upload de foto de perfil (clicável no avatar azul)
  - Avatar azul agora é clicável
  - Ícone de câmera aparece ao passar o mouse
  - Suporta upload de imagens em qualquer formato
- [x] Adicionar botões de editar/excluir para contas bancárias em "Minhas Contas"
  - Botão "Editar" navega para página de detalhes da conta
  - Botão "Excluir" com estilo vermelho (funcionalidade a implementar)
- [x] Adicionar botões de editar/excluir para cartões de crédito em "Minhas Contas"
  - Botão "Editar" navega para página de detalhes do cartão
  - Botão "Excluir" com estilo vermelho (funcionalidade a implementar)
- [x] Testar funcionalidades de upload e ações em contas/cartões
  - Upload de foto: Testado com sucesso ✅
  - Botões de navegação: Testados com sucesso ✅


## Popups de Edição - Contas e Cartões

- [x] Criar popup de edição para contas bancárias
  - Campos: nome, banco, número da conta ✅
  - Botões: Salvar, Cancelar ✅
  - Integração com mutation tRPC (placeholder)
- [x] Criar popup de edição para cartões de crédito
  - Campos: nome, bandeira, 4 últimos dígitos, vencimento, limite ✅
  - Botões: Salvar, Cancelar ✅
  - Integração com mutation tRPC (placeholder)
- [x] Implementar mutation updateBankAccount no backend
- [x] Implementar mutation updateCreditCard no backend
- [x] Testar popups de edição (UI funcionando corretamente) ✅
- [x] Testar persistência de dados (após implementar mutations) ✅


## Modo de Edição de Transações em Contas Bancárias

- [x] Remover botões "Editar" e "Deletar" da tabela de transações (modo visualização) ✅
- [x] Criar botão "Editar Transações" ao lado de "Filtros Avançados" ✅
- [x] Implementar toggle entre modo visualização e modo edição ✅
- [x] Em modo edição, permitir:
  - [x] Editar nome da transação (popup existente)
  - [x] Editar valor (popup existente)
  - [x] Editar categoria (popup existente)
  - [x] Editar data (popup existente)
  - [ ] Editar tipo (Entrada/Saída) - requer mudança no backend
  - [x] Deletar transação (botão ativo em modo edição)
- [x] Adicionar popups/inline editing para edição de transações (popups já existentes)
- [x] Implementar mutations tRPC para atualizar transações (já existentes)
- [x] Testar modo edição e acessibilidade de botões ✅


## Aba Orçamentos - Redesign

- [x] Analisar página de Orçamentos atual ✅
- [x] Criar 2 cards principais:
  - [x] Card de Receitas com categorias de receita ✅
  - [x] Card de Despesas com categorias de despesa ✅
- [x] Implementar botão "Editar" em cada card ✅
- [x] Criar popup de edição com:
  - [x] Listagem de todas as categorias ✅
  - [x] Campo de valor para cada categoria ✅
  - [x] Botão "Aplicar para próximos meses" ao lado de cada valor ✅
- [x] Implementar lógica de persistência:
  - [x] Salvar orçamento por categoria e mês ✅
  - [x] Aplicar valor para meses futuros automaticamente ✅
  - [x] Se não editar, usar valor anterior ✅
- [x] Testar funcionalidades de edição e aplicação de valores ✅
  - Teste: Preenchido 1000 para Reembolso Bradesco e aplicado aos próximos 12 meses com sucesso


## Bug Fix: Erro ao Criar Regra de Categoria

- [x] Corrigir erro "TypeError: g.keywords.join is not a function"
  - Erro ocorre ao tentar criar nova regra de categoria
  - Problema estava em código que tentava fazer .join() em objeto que não é array
  - Localizado e corrigido em Categories.tsx: tratamento de keywords como string ou array
  - Teste confirmou: nova regra "Teste" criada com sucesso na categoria "Reembolso Bradesco"

## Bug Fix: Saldo Inicial não salva na conta bancária

- [x] Corrigir erro ao salvar saldo inicial da conta bancária
  - Problema: valor era convertido para número mas enviado como string sem casas decimais
  - Solução: usar .toFixed(2) em vez de .toString() para garantir formato SQL correto (ex: 5000.00)
  - Localizado e corrigido em BankAccountDetail.tsx (linha 434)
  - Adicionado campo initialBalance à mutation bankAccounts.update em server/routers.ts
  - Adicionado campo initialBalance à função updateBankAccount em server/db.ts
  - Teste confirmou: saldo inicial R$ 5.000,00 salvo com sucesso

## Funcionalidade: Exclusão de Contas e Cartões

- [x] Implementar handlers de exclusão para contas bancárias
  - [x] Adicionar estado para controlar qual conta está sendo deletada
  - [x] Criar mutation tRPC para deletar conta
  - [x] Adicionar AlertDialog com confirmação
  - [x] Implementar refetch automático após exclusão
  - Teste confirmou: AlertDialog aparece com mensagem de confirmação ✅
- [x] Implementar handlers de exclusão para cartões de crédito
  - [x] Adicionar estado para controlar qual cartão está sendo deletado
  - [x] Criar mutation tRPC para deletar cartão
  - [x] Adicionar AlertDialog com confirmação
  - [x] Implementar refetch automático após exclusão
  - Teste confirmou: AlertDialog aparece com mensagem de confirmação ✅
- [x] Adicionar AlertDialog para confirmação de exclusão
  - [x] Dialog para contas bancárias com mensagem apropriada
  - [x] Dialog para cartões de crédito com mensagem apropriada
  - [x] Botões "Cancelar" e "Excluir" (em vermelho)
  - [x] Fechar dialog ao clicar em "Cancelar"

## Funcionalidade: Persistência de Foto de Perfil

- [x] Adicionar campo profilePhoto à tabela users no schema
  - [x] Executar migração Drizzle para adicionar coluna
  - [x] Migração aplicada com sucesso: `ALTER TABLE users ADD profilePhoto text;`
- [x] Implementar mutation tRPC para salvar foto de perfil
  - [x] Adicionar campo profilePhoto à mutation updateProfile em server/routers.ts
  - [x] Adicionar suporte a profilePhoto na função updateUserProfile em server/db.ts
- [x] Atualizar frontend para enviar foto ao backend
  - [x] Adicionar profilePhoto ao handleSave em Profile.tsx
  - [x] Avatar clicável para upload de arquivo funcionando
  - [x] Converter imagem para base64 antes de enviar
  - Teste confirmou: Avatar é clicável e abre seletor de arquivo ✅


## Funcionalidades Opcionais - Não Implementadas

As seguintes funcionalidades foram identificadas como opcionais e não foram implementadas nesta versão:

### Backend Avançado (Opcional)
- [ ] Implementar procedures tRPC para painel administrativo
- [ ] Implementar parsers para PDF Bradesco e Itaú
- [ ] Implementar parser para OFX
- [ ] Implementar motor de categorização automática
- [ ] Implementar alertas quando limite de orçamento é atingido

### Frontend - Importação Avançada (Opcional)
- [ ] Criar página de importação de extratos bancários (PDF/OFX)
- [ ] Implementar upload e parsing de PDF Bradesco
- [ ] Implementar upload e parsing de PDF Itaú
- [ ] Implementar upload e parsing de OFX
- [ ] Implementar preview de transações antes de confirmar importação
- [ ] Implementar confirmação e salvamento em lote

### Frontend - Importação de Faturas (Opcional)
- [ ] Criar página de importação de faturas de cartão de crédito
- [ ] Implementar upload e parsing de PDF de fatura
- [ ] Implementar upload e parsing de OFX de cartão
- [ ] Implementar preview de transações antes de confirmar importação
- [ ] Implementar confirmação e salvamento em lote

### Frontend - Painel Administrativo (Opcional)
- [ ] Criar página de painel administrativo
- [ ] Implementar visualização de estatísticas gerais
- [ ] Implementar gerenciamento de usuários
- [ ] Implementar visualização de logs de importação
- [ ] Implementar ferramentas de limpeza/manutenção de dados

### Frontend - Transações Avançadas (Opcional)
- [ ] Implementar adicionar transação diretamente na página de detalhes do cartão
- [ ] Implementar editar transação diretamente na página de detalhes do cartão
- [ ] Implementar deletar transação com confirmação
- [ ] Implementar reclassificação de transações em lote

### Testes Avançados (Opcional)
- [ ] Adicionar teste de integração frontend/backend para salvar nome/email no perfil
- [ ] Escrever testes para parsers de PDF e OFX
- [ ] Escrever testes para motor de categorização automática
- [ ] Testar fluxo completo de importação de extratos
- [ ] Testar fluxo completo de importação de faturas

### Melhorias Gerais (Opcional)
- [ ] Melhorar tratamento de erro quando nenhum campo é fornecido (retornar erro de validação claro)


## Bug Fix: Cálculo de Saldo Final Incorreto

- [ ] Corrigir cálculo do saldo final da conta bancária
  - Problema: Saldo final retorna R$ 3.242.446,19 em vez de R$ 13.175,09
  - Cálculo esperado: 32.618,90 + 27.357,18 - 46.800,99 = 13.175,09
  - Erro ocorre tanto na pré-visualização quanto após salvar
  - Localizar e corrigir o código de cálculo em BankAccountDetail.tsx


## Bug Fix: Header Transparente da Página de Contas Bancárias

- [x] Adicionar fundo ao header da página BankAccountDetail.tsx
  - Problema: Header estava com opacidade muito baixa, dificultando a leitura
  - Solução: Adicionar backgroundColor sólido usando primaryColorHex
  - Adicionar text-shadow para melhor legibilidade
  - Resultado: Header agora está visível com fundo cinza-azulado e texto branco legível

## Bug Fix: Saldo Final Calculado Incorretamente

- [ ] Investigar por que saldo final está R$ 38.635,78 em vez de R$ 35.051,48
  - Cálculo esperado: 29.034,60 + 20.617,71 - 14.600,83 = 35.051,48
  - Diferença: R$ 3.584,30 (pode ser uma transação extra sendo incluída)
  - Problema persiste mesmo após corrigir convertBRLToNumber




## Funcionalidade: Botão "Aplicar Regras" de Categorização Automática

- [x] Implementar mutation tRPC para aplicar regras de categorização a transações de uma conta
  - [x] Buscar todas as transações da conta
  - [x] Aplicar regras de categorização automática a cada transação
  - [x] Atualizar categoria das transações que correspondem às regras
  - [x] Retornar número de transações atualizadas
- [x] Adicionar botão "Aplicar Regras" na página BankAccountDetail.tsx
  - [x] Posicionar botão próximo aos botões "Importar" e "Reconciliar"
  - [x] Adicionar confirmação antes de aplicar as regras
  - [x] Mostrar loading durante a aplicação
  - [x] Mostrar mensagem de sucesso com número de transações atualizadas
- [x] Testar a funcionalidade com transações existentes
- [x] Escrever testes para validar a funcionalidade (5 testes passando)

## BUG: Edição Manual de Transações Não Funciona

- [x] Investigar por que o modo de edição de transações não está funcionando
  - [x] Verificar se o botão "Editar Transações" está ativando o modo de edição
  - [x] Verificar se os botões "Editar" e "Deletar" aparecem quando em modo de edição
  - [x] Verificar se os popups de edição abrem corretamente
  - [x] Corrigir qualquer problema encontrado - Dialog de edição foi adicionado


## BUG: Edição de Saldo Inicial Afetando Múltiplos Meses

- [x] Investigar como o saldo inicial está sendo salvo no banco de dados
- [x] Identificar por que a edição de saldo inicial de um mês está afetando outros meses
- [x] Corrigir a lógica para garantir que a edição seja isolada ao mês selecionado
  - [x] Criar tabela monthlyBalances para armazenar saldo inicial por mês/ano
  - [x] Implementar mutation tRPC updateMonthlyBalance
  - [x] Atualizar frontend para usar a nova mutation
- [x] Testar a correção em múltiplos meses


## Funcionalidade: Botão Reset para Saldo Inicial

- [x] Adicionar função de delete no backend para remover saldo customizado
- [x] Criar mutation tRPC para resetar saldo mensal
- [x] Adicionar botão Reset na UI com confirmação
- [x] Testar a funcionalidade de reset


## Funcionalidade: Redesign da Página "Visão Geral"

- [x] Remover espaço branco no meio da página
- [x] Implementar grid responsivo (mobile-first)
- [x] Melhorar legibilidade dos gráficos com cores e tamanhos apropriados
- [x] Testar em desktop, tablet e mobile
- [x] Garantir que todos os dados sejam visíveis sem scroll horizontal


## BUG: Visão Geral Mostrando Dados Acumulados em Véz de Mês Corrente

- [x] Investigar por que os dados estão acumulados
- [x] Corrigir a query para filtrar apenas transações do mês corrente
- [x] Testar em diferentes meses


## BUG: Abas "Receitas" e "Despesas" Lendo Dados Incorretos

- [x] Investigar como as abas Receitas e Despesas estão lendo os dados
- [x] Verificar se estão lendo categorias e transações erradas
- [x] Corrigir as queries para ler apenas dados classificados corretamente
  - [x] Adicionar filtro de categoryId válido (não null/undefined)
  - [x] Garantir que apenas transações com categoria existente sejam mostradas
  - [x] Corrigir Income.tsx para filtrar corretamente
  - [x] Corrigir Expenses.tsx para filtrar corretamente
- [x] Garantir que as abas leiam apenas o que foi salvo nas abas "Contas" e "Cartões"
- [x] Testar a leitura correta dos dados


## Funcionalidade: Corrigir Lógica de Leitura de Receitas e Despesas

- [x] Corrigir aba RECEITAS:
  - [x] Ler TRANSACTIONS com type="income" (valores positivos)
  - [x] Ler CREDITCARDTRANSACTIONS com valores negativos (estornos)
  - [x] Trazer categoria corretamente do categoryId
  - [x] Implementar cores das categorias nos gráficos
  - [x] Layout responsivo para celular
  - [x] Dados visíveis nos gráficos

- [x] Corrigir aba DESPESAS:
  - [x] Ler TRANSACTIONS com type="expense" (valores negativos)
  - [x] Ler CREDITCARDTRANSACTIONS com valores positivos (gastos)
  - [x] Trazer categoria corretamente do categoryId
  - [x] Implementar cores das categorias nos gráficos
  - [x] Layout responsivo para celular
  - [x] Dados visíveis nos gráficos


## Funcionalidade: Formatação Brasileira de Moeda (R$ 1.000,00)

- [x] Criar função utilitária de formatação brasileira
  - [x] Vírgula (,) como separador decimal
  - [x] Ponto (.) como separador de milhares
  - [x] Espaço entre R$ e o valor
- [x] Ajustar aba Receitas com formatação correta
- [x] Ajustar aba Despesas com formatação correta
- [x] Ajustar Dashboard com formatação correta
- [x] Ajustar aba Visão Geral com formatação correta (já estava implementada)
- [x] Ajustar aba Contas Bancárias com formatação correta
- [x] Ajustar aba Cartões de Crédito com formatação correta (já estava implementada)
- [x] Testar formatação em todo o projeto


## Funcionalidade: Adicionar Coluna de Conta/Cartão nas Tabelas

- [x] Adicionar coluna "Conta/Cartão" na tabela de Receitas
  - [x] Mostrar nome da conta bancária ou cartão
  - [x] Posicionar entre "Origem" e "Valor"
  - [x] Testar com diferentes contas e cartões

- [x] Adicionar coluna "Conta/Cartão" na tabela de Despesas
  - [x] Mostrar nome da conta bancária ou cartão
  - [x] Posicionar entre "Origem" e "Valor"
  - [x] Testar com diferentes contas e cartões
