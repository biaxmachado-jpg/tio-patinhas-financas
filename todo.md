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

### Frontend - Contas Bancarias
- [x] Criar pagina de listagem de contas bancarias
- [x] Implementar formulario de criacao/edicao de conta
- [x] Criar pagina de detalhes da conta com saldo e transacoes
- [x] Implementar visualizacao de historico de saldo

### Frontend - Cartoes de Credito
- [x] Criar pagina de listagem de cartoes de credito
- [x] Implementar formulario de criacao/edicao de cartao
- [x] Criar pagina de detalhes do cartao com transacoes
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
- [ ] Implementar alertas quando limite é atingido

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
- [x] Escrever testes unitarios para procedures tRPC (28 testes passando)
- [ ] Escrever testes para parsers de PDF e OFX
- [ ] Escrever testes para motor de categorizacao automatica
- [ ] Testar fluxo completo de importacao de extratos
- [ ] Testar fluxo completo de importacao de faturas
- [x] Validar calculos de saldo e orcamento
- [x] Testar reconciliacao de transacoes

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
