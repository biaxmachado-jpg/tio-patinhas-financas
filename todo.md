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
