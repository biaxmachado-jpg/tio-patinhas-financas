# Tio Patinhas Finanças - Bia

Sistema web de gestão financeira pessoal com visual elegante e sofisticado. Permite controle completo sobre finanças do dia a dia com suporte a contas bancárias, cartões de crédito, categorização automática de transações, orçamentos e análise de gastos.

## 🎯 Funcionalidades

1. **Dashboard Principal** — Resumo financeiro com gráficos (receitas vs despesas, despesas por categoria)
2. **Gestão de Contas Bancárias** — CRUD de contas, com saldo inicial de cada mês calculado automaticamente a partir do saldo final do mês anterior
3. **Gestão de Cartões de Crédito** — Cadastro com limite, dia de vencimento e dia de fechamento
4. **Receitas e Despesas** — Registro de transações com data, categoria, conta vinculada e descrição
5. **Categorias Personalizadas** — Cores e ícones configuráveis, com regras de categorização automática (por palavra-chave, prioridade e ativação) gerenciadas na própria página de Categorias
6. **Orçamentos (Orçado x Real)** — Acompanhamento do limite mensal definido por categoria vs. gasto real
7. **Importação de Extratos** — Upload de PDF, OFX, XLSX, XLS, CSV e TXT, com detecção automática do banco (Itaú, Bradesco, Nubank, Caixa Econômica, Santander, Banco do Brasil e BRB) e checagem de duplicatas antes de importar
8. **Banco de Dados** — Painel administrativo com visão geral das tabelas do sistema
9. **Perfil** — Edição de dados do usuário com histórico de alterações

## 🛠️ Stack Tecnológico

### Frontend
- **React 19** — UI moderna e reativa
- **Tailwind CSS 4** — Estilização com cores OKLCH
- **TypeScript** — Type safety
- **tRPC** — Chamadas de API type-safe
- **Recharts** — Gráficos e visualizações
- **shadcn/ui** — Componentes UI
- **wouter** — Roteamento
- **Vite** — Build tool

### Backend
- **Express 4** — Servidor web
- **tRPC 11** — RPC framework type-safe
- **Drizzle ORM** — Query builder type-safe
- **MySQL/TiDB** — Banco de dados
- **Node.js 22**

### Testes
- **Vitest** — Framework de testes unitários (parsers de importação bancária)

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

# Autenticação (login único do proprietário, protegido por senha — ver seção abaixo)
JWT_SECRET="seu_jwt_secret"
APP_PASSWORD="sua_senha_de_acesso"
OWNER_NAME="Bia"
OWNER_OPEN_ID="seu_identificador_interno"

# APIs opcionais (geração de imagem / transcrição de voz)
BUILT_IN_FORGE_API_URL="https://api.manus.im"
BUILT_IN_FORGE_API_KEY="sua_api_key"

# Analytics (opcional)
VITE_ANALYTICS_ENDPOINT="seu_analytics_endpoint"
VITE_ANALYTICS_WEBSITE_ID="seu_website_id"

# URL pública da API (usada no build do frontend quando front e back
# são publicados separadamente, ex.: Firebase Hosting + Cloud Run)
VITE_API_URL="https://sua-api.exemplo.com"
```

### 4. Configurar banco de dados

```bash
# Gerar e aplicar migrations
pnpm db:push
```

## 🔐 Autenticação

O acesso é feito por uma tela de login simples (`/login`) protegida por senha única (`APP_PASSWORD`), pensada para um único usuário proprietário da conta — não há cadastro de múltiplos usuários nem fluxo OAuth externo. No primeiro login, o usuário proprietário (`OWNER_NAME` / `OWNER_OPEN_ID`) é criado automaticamente no banco.

> ⚠️ Defina `APP_PASSWORD` e `JWT_SECRET` com valores próprios antes de publicar em produção — ambos têm um valor padrão de desenvolvimento no código, usado apenas quando a variável não está definida.

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

```bash
pnpm test          # roda os testes uma vez
```

## 📁 Estrutura do Projeto

```
.
├── client/                 # Frontend React
│   └── src/
│       ├── pages/          # Dashboard, Contas, Cartões, Categorias, etc.
│       ├── components/     # Componentes reutilizáveis
│       ├── contexts/       # React contexts
│       ├── hooks/          # Custom hooks
│       ├── lib/            # Utilitários (cliente tRPC, detecção de banco)
│       ├── App.tsx         # Roteamento principal
│       └── index.css       # Estilos globais
├── server/                 # Backend Express + tRPC
│   ├── routers.ts          # Procedures tRPC
│   ├── db.ts               # Camada de acesso a dados (Drizzle)
│   ├── categorizationEngine.ts
│   ├── duplicateDetection.ts
│   ├── parsers/            # Parsers de extrato bancário (ex.: BRB)
│   └── _core/               # Framework core (não editar)
├── drizzle/                 # Schema e migrations
│   └── schema.ts
└── shared/                  # Tipos e constantes compartilhados
```

## 🔑 Variáveis de Ambiente Explicadas

| Variável | Descrição | Obrigatório |
|----------|-----------|-----------|
| `DATABASE_URL` | String de conexão MySQL/TiDB | ✅ |
| `JWT_SECRET` | Chave secreta para assinar a sessão | ✅ |
| `APP_PASSWORD` | Senha de acesso ao sistema | ✅ |
| `OWNER_NAME` | Nome do proprietário da conta | ❌ (default: `Bia`) |
| `OWNER_OPEN_ID` | Identificador interno do proprietário | ❌ (default: `bia-owner`) |
| `PORT` | Porta do servidor | ❌ (default: `3000`, Docker usa `8080`) |
| `BUILT_IN_FORGE_API_URL` / `BUILT_IN_FORGE_API_KEY` | Credenciais para geração de imagem/transcrição de voz | ❌ |
| `VITE_ANALYTICS_ENDPOINT` / `VITE_ANALYTICS_WEBSITE_ID` | Analytics do frontend | ❌ |
| `VITE_API_URL` | URL pública da API, embutida no build do frontend | ❌ |

## 🎨 Design e Estilo

- **Cores primárias**: OKLCH colors para melhor percepção visual
- **Tipografia**: Poppins (headings) + Inter (body)
- **Componentes**: shadcn/ui com customizações Tailwind
- **Tema**: Light/Dark mode suportado

## 🚀 Deploy

O workflow em `.github/workflows/firebase-deploy.yml` publica automaticamente a cada push em `main`:
- **Frontend** (`dist/public`) → Firebase Hosting
- **Backend** (Express/tRPC) → Google Cloud Run, via imagem construída a partir do `Dockerfile`

## 🚨 Troubleshooting

### Erro: "DATABASE_URL inválida"
- Verifique a string de conexão MySQL/TiDB
- Certifique-se que o banco existe
- Teste a conexão manualmente

### Erro: "Senha incorreta" ao logar
- Confirme o valor de `APP_PASSWORD` configurado no ambiente

### Testes falhando
- Execute `pnpm install` novamente
- Execute `pnpm test` para ver detalhes

## 📝 Scripts Disponíveis

```bash
pnpm dev              # Iniciar servidor de desenvolvimento
pnpm build            # Build para produção
pnpm start            # Iniciar servidor de produção
pnpm test             # Executar testes
pnpm check            # Type check com TypeScript
pnpm format           # Formatar código com Prettier
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

**Bia** (bia.x.machado@gmail.com)

## 📞 Suporte

Para dúvidas ou problemas, abra uma issue no repositório GitHub.

---

**Versão:** 1.0.0
**Status:** ✅ Produção
