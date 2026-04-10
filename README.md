# Tio Patinhas Finanças - Bia

Sistema web de gestão financeira pessoal com visual elegante e sofisticado. Permite controle completo sobre suas finanças do dia a dia com suporte a contas bancárias, cartões de crédito, categorização automática de transações, orçamentos e análise de gastos.

## 🎯 Funcionalidades

1. **Dashboard Principal** - Resumo financeiro com gráficos (receitas vs despesas, despesas por categoria)
2. **Gestão de Contas Bancárias** - CRUD de contas com saldo e histórico
3. **Gestão de Cartões de Crédito** - Cadastro com limite, dia de vencimento, dia de fechamento
4. **Registro de Transações** - Receitas e despesas com data, categoria, conta vinculada e descrição
5. **Categorias Personalizadas** - Cores e ícones configuráveis pelo usuário
6. **Orçamentos Mensais** - Acompanhamento do limite definido vs gasto real
7. **Regras de Categorização** - Categorização automática com matchType, prioridade e ativação
8. **Reconciliação de Transações** - Marcação visual de transações reconciliadas
9. **Importação de Extratos** - Suporte para PDF (Bradesco, Itaú) e OFX (funcionalidade avançada)
10. **Painel Administrativo** - Gerenciamento de dados (funcionalidade avançada)

## 🛠️ Stack Tecnológico

### Frontend
- **React 19** - UI moderna e reativa
- **Tailwind CSS 4** - Estilização com OKLCH colors
- **TypeScript** - Type safety
- **tRPC** - Type-safe API calls
- **Recharts** - Gráficos e visualizações
- **shadcn/ui** - Componentes UI sofisticados
- **Vite** - Build tool rápido

### Backend
- **Express 4** - Servidor web
- **tRPC 11** - RPC framework type-safe
- **Drizzle ORM** - Query builder type-safe
- **MySQL/TiDB** - Banco de dados
- **Node.js** - Runtime

### Testes
- **Vitest** - Framework de testes unitários
- **28 testes** passando com sucesso

## 📋 Pré-requisitos

- Node.js 22.13.0 ou superior
- pnpm 10.4.1 ou superior
- MySQL 8.0+ ou TiDB
- Git

## 🚀 Instalação

### 1. Clonar o repositório

```bash
git clone https://github.com/biaxmachado-jpg/tio-patinhas-financas-bia-novo.git
cd tio-patinhas-financas-bia-novo
```

### 2. Instalar dependências

```bash
pnpm install
```

### 3. Configurar variáveis de ambiente

Crie um arquivo `.env` na raiz do projeto:

```bash
# Banco de dados
DATABASE_URL="mysql://usuario:senha@host:porta/nome_banco?ssl={\"rejectUnauthorized\":true}"

# Autenticação OAuth (Manus)
VITE_APP_ID="seu_app_id"
OAUTH_SERVER_URL="https://api.manus.im"
VITE_OAUTH_PORTAL_URL="https://oauth.manus.im"
JWT_SECRET="seu_jwt_secret"

# Informações do proprietário
OWNER_NAME="Bia"
OWNER_OPEN_ID="seu_open_id"

# APIs Manus (opcional)
BUILT_IN_FORGE_API_URL="https://api.manus.im"
BUILT_IN_FORGE_API_KEY="sua_api_key"
VITE_FRONTEND_FORGE_API_URL="https://api.manus.im"
VITE_FRONTEND_FORGE_API_KEY="sua_frontend_api_key"

# Analytics (opcional)
VITE_ANALYTICS_ENDPOINT="seu_analytics_endpoint"
VITE_ANALYTICS_WEBSITE_ID="seu_website_id"
```

### 4. Configurar banco de dados

```bash
# Gerar migrations
pnpm drizzle-kit generate

# Aplicar migrations
pnpm drizzle-kit migrate
```

### 5. Importar dados (opcional)

Se você tem dados do banco original, use os scripts de migração:

```bash
# Migrar dados gerais
node migrate-complete.mjs

# Migrar regras de categorização
node migrate-rules.mjs

# Remapear usuários
node remap-user-id.mjs

# Validar migração
node validate-migration.mjs
```

## 🏃 Executar o projeto

### Modo desenvolvimento

```bash
pnpm dev
```

O servidor estará disponível em `http://localhost:3000`

### Modo produção

```bash
# Build
pnpm build

# Iniciar servidor
pnpm start
```

## 🧪 Testes

Executar todos os testes:

```bash
pnpm test
```

Executar testes em modo watch:

```bash
pnpm test:watch
```

## 📁 Estrutura do Projeto

```
.
├── client/                 # Frontend React
│   ├── src/
│   │   ├── pages/         # Páginas (Dashboard, Contas, etc)
│   │   ├── components/    # Componentes reutilizáveis
│   │   ├── contexts/      # React contexts
│   │   ├── hooks/         # Custom hooks
│   │   ├── lib/           # Utilitários (tRPC client)
│   │   ├── App.tsx        # Roteamento principal
│   │   └── index.css      # Estilos globais
│   └── public/            # Assets estáticos
├── server/                # Backend Express + tRPC
│   ├── routers.ts         # Procedures tRPC
│   ├── db.ts              # Query helpers
│   ├── _core/             # Framework core (não editar)
│   └── *.test.ts          # Testes unitários
├── drizzle/               # Schema e migrations
│   └── schema.ts          # Definição de tabelas
├── shared/                # Código compartilhado
└── storage/               # Helpers S3

```

## 🔑 Variáveis de Ambiente Explicadas

| Variável | Descrição | Obrigatório |
|----------|-----------|-----------|
| `DATABASE_URL` | String de conexão MySQL/TiDB | ✅ |
| `VITE_APP_ID` | ID da aplicação OAuth Manus | ✅ |
| `JWT_SECRET` | Chave secreta para sessões | ✅ |
| `OWNER_NAME` | Nome do proprietário | ✅ |
| `OWNER_OPEN_ID` | OpenID do proprietário | ✅ |
| `OAUTH_SERVER_URL` | URL do servidor OAuth | ✅ |
| `VITE_OAUTH_PORTAL_URL` | URL do portal OAuth | ✅ |
| `BUILT_IN_FORGE_API_URL` | URL da API Manus | ❌ |
| `BUILT_IN_FORGE_API_KEY` | Chave da API Manus | ❌ |
| `VITE_ANALYTICS_ENDPOINT` | Endpoint de analytics | ❌ |
| `VITE_ANALYTICS_WEBSITE_ID` | ID do website para analytics | ❌ |

## 🎨 Design e Estilo

O projeto utiliza uma paleta de cores elegante e sofisticada:

- **Cores primárias**: OKLCH colors para melhor percepção visual
- **Tipografia**: Poppins (headings) + Inter (body)
- **Componentes**: shadcn/ui com customizações Tailwind
- **Espaçamento**: Generoso para melhor legibilidade
- **Tema**: Light/Dark mode suportado

## 📊 Dados Inclusos

O projeto vem com dados pré-carregados:

- 11 contas bancárias
- 3 cartões de crédito
- 162 transações
- 258 transações de cartão de crédito
- 38 categorias
- 20 orçamentos
- 7 regras de categorização

## 🔐 Segurança

- ✅ Autenticação OAuth Manus integrada
- ✅ Sessões seguras com JWT
- ✅ Proteção CSRF
- ✅ Validação de entrada com Zod
- ✅ Queries parametrizadas (Drizzle ORM)
- ✅ Proteção de dados sensíveis

## 🚨 Troubleshooting

### Erro: "Já existe um repositório com este nome"
- Solução: Use um nome diferente ou desconecte o repositório antigo

### Erro: "DATABASE_URL inválida"
- Verifique a string de conexão MySQL/TiDB
- Certifique-se que o banco existe
- Teste a conexão manualmente

### Erro: "OAuth não configurado"
- Verifique `VITE_APP_ID` e `OAUTH_SERVER_URL`
- Certifique-se que a aplicação está registrada no Manus

### Erro: "Testes falhando"
- Execute `pnpm install` novamente
- Limpe cache: `rm -rf node_modules/.vite`
- Execute `pnpm test` para ver detalhes

## 📝 Scripts Disponíveis

```bash
pnpm dev              # Iniciar servidor de desenvolvimento
pnpm build            # Build para produção
pnpm start            # Iniciar servidor de produção
pnpm test             # Executar testes
pnpm format           # Formatar código com Prettier
pnpm check            # Type check com TypeScript
pnpm db:push          # Gerar e aplicar migrations
```

## 🤝 Contribuindo

1. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
2. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
3. Push para a branch (`git push origin feature/AmazingFeature`)
4. Abra um Pull Request

## 📄 Licença

MIT

## 👤 Autor

**Bia** (biaxmachado@hotmail.com)

## 🙏 Agradecimentos

- Manus por fornecer a plataforma e ferramentas
- shadcn/ui pelos componentes UI
- Comunidade open-source

## 📞 Suporte

Para dúvidas ou problemas, abra uma issue no repositório GitHub.

---

**Versão:** 1.0.0  
**Última atualização:** Abril 2026  
**Status:** ✅ Produção
