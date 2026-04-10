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
- [ ] Implementar procedures tRPC para painel administrativo
- [ ] Implementar parsers para PDF Bradesco e Itaú
- [ ] Implementar parser para OFX
- [ ] Implementar motor de categorização automática

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

### Frontend - Contas Bancárias
- [x] Criar página de listagem de contas bancárias
- [x] Implementar formulário de criação/edição de conta
- [ ] Criar página de detalhes da conta com saldo e transações
- [ ] Implementar visualização de histórico de saldo

### Frontend - Cartões de Crédito
- [x] Criar página de listagem de cartões de crédito
- [x] Implementar formulário de criação/edição de cartão
- [ ] Criar página de detalhes do cartão com transações
- [ ] Implementar visualização de fatura mensal
- [x] Implementar acompanhamento de limite utilizado vs disponível

### Frontend - Transações
- [x] Criar página de listagem de transações com filtros
- [x] Implementar formulário de criação/edição de transação
- [ ] Implementar filtros por data, categoria, conta, tipo
- [ ] Implementar busca por descrição
- [ ] Criar visualização de detalhes da transação

### Frontend - Categorias
- [x] Criar página de gerenciamento de categorias
- [x] Implementar formulário de criação/edição com seletor de cor e ícone
- [x] Implementar listagem com preview de cores e ícones
- [x] Implementar exclusão com validação

### Frontend - Orçamentos
- [x] Criar página de gerenciamento de orçamentos mensais
- [x] Implementar formulário de criação/edição por categoria
- [x] Implementar visualização de progresso (limite vs gasto)
- [ ] Implementar alertas quando limite é atingido

### Frontend - Importação de Extratos
- [ ] Criar página de importação de extratos bancários
- [ ] Implementar upload e parsing de PDF Bradesco
- [ ] Implementar upload e parsing de PDF Itaú
- [ ] Implementar upload e parsing de OFX
- [ ] Implementar preview de transações antes de confirmar importação
- [ ] Implementar confirmação e salvamento em lote

### Frontend - Importação de Faturas
- [ ] Criar página de importação de faturas de cartão de crédito
- [ ] Implementar upload e parsing de PDF de fatura
- [ ] Implementar upload e parsing de OFX de cartão
- [ ] Implementar preview de transações antes de confirmar importação
- [ ] Implementar confirmação e salvamento em lote

### Frontend - Regras de Categorização
- [x] Criar página de gerenciamento de regras de categorização
- [x] Implementar formulário com campos: categoria, palavras-chave, matchType, caseSensitive, prioridade, enabled
- [x] Implementar listagem com visualização de todas as propriedades
- [x] Implementar edição e exclusão de regras
- [x] Implementar toggle de ativação/desativação
- [x] Implementar reordenação por prioridade

### Frontend - Reconciliação
- [x] Criar página de reconciliação de transações
- [x] Implementar visualização de transações não reconciliadas
- [x] Implementar marcação de reconciliação
- [ ] Implementar filtros por período e conta

### Frontend - Painel Administrativo
- [ ] Criar página de painel administrativo
- [ ] Implementar visualização de estatísticas gerais
- [ ] Implementar gerenciamento de usuários (se aplicável)
- [ ] Implementar visualização de logs de importação
- [ ] Implementar ferramentas de limpeza/manutenção de dados

### Frontend - Design & UX
- [ ] Implementar componentes de loading e skeleton
- [ ] Implementar tratamento de erros com mensagens amigáveis
- [ ] Implementar notificações (toast) para ações bem-sucedidas
- [ ] Implementar confirmações para ações destrutivas
- [ ] Implementar responsividade para dispositivos móveis
- [ ] Implementar acessibilidade (ARIA labels, keyboard navigation)

### Testes & Validação
- [ ] Escrever testes unitários para procedures tRPC
- [ ] Escrever testes para parsers de PDF e OFX
- [ ] Escrever testes para motor de categorização automática
- [ ] Testar fluxo completo de importação de extratos
- [ ] Testar fluxo completo de importação de faturas
- [ ] Validar cálculos de saldo e orçamento
- [ ] Testar reconciliação de transações

## Notas Importantes
- Todas as 10 funcionalidades devem estar presentes
- Nenhum detalhe de nomenclatura ou comportamento deve ser omitido
- Visual elegante e sofisticado é requisito obrigatório
- Bia é a proprietária do sistema
- Usar DashboardLayout para navegação consistente


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
