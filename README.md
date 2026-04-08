# Diário de Tarefas (PWA)

Aplicação PWA em React + TypeScript para registrar e acompanhar as tarefas diárias com visualização em tabela e Kanban.

## Principais recursos

- Cadastro, edição e exclusão de tarefas com os campos:
  - Título
  - Produto (SISGRADE, SIVOPE, CIEVS, GESTÃO)
  - Status (NOVO, EM ANDAMENTO, PAUSADO, CONCLUIDO)
  - Tempo trabalhado (horas) e observações opcionais
  - Data planejada/realizada da tarefa
- Filtros por produto, status e data disponíveis para ambas as visualizações
- Filtro por data já aplicado ao dia atual por padrão
- Modal obrigatório para informar/ajustar o tempo quando a tarefa é concluída
- Criação e edição de tarefas em modal dedicado
- Visualizações em tabela e Kanban com drag & drop entre colunas
- Visualização em calendário com navegação mensal e resumo diário
- Controle de acesso com autenticação, usuários ativos/inativos e CRUD dedicado
- Apenas administradores podem acessar a gestão de usuários
- Regras de status: tarefas que saem de **NOVO** não retornam, e tarefas **CONCLUIDAS** não reabrem
- Campo de atribuição com múltiplos responsáveis (default atribuído ao criador) e filtro “Atribuído a mim”
- Notificações por SMS quando uma nova tarefa é atribuída ao usuário logado
- Sincronização entre dispositivos via API Node (Express + SQLite local ou PostgreSQL em produção)
- Configuração PWA (`vite-plugin-pwa`) com service worker gerado automaticamente

## Executando localmente

```bash
npm install
npm run dev
```

O servidor de desenvolvimento ficará disponível em <http://localhost:5173>.

## Build e verificação

```bash
# checar tipos e gerar bundle de produção
npm run build

# executar lint (ESLint)
npm run lint
```

Os artefatos finais ficam em `dist/` após o build. O service worker e o manifest são gerados automaticamente pelo `vite-plugin-pwa`.

## Autenticação e gestão de usuários

- A aplicação exige login. Apenas usuários com status **Ativo** conseguem acessar o painel.
- Na primeira execução da **API** (`server/`), se não houver usuários, é criado um administrador padrão:

  | E-mail        | Senha    | Observações                        |
  | ------------- | -------- | ---------------------------------- |
  | admin@local   | admin123 | Recomenda-se alterar após o login. |

  (Valores configuráveis em `server/.env`: `BOOTSTRAP_ADMIN_EMAIL`, `BOOTSTRAP_ADMIN_PASSWORD`.)

- Somente usuários com perfil **Administrador** têm acesso à aba **Gestão de usuários** para criar, editar, inativar/ativar e excluir contas.
- Não é possível excluir o último usuário ativo nem remover o usuário atualmente autenticado.
- Cada usuário possui um telefone (DDD + número) utilizado para disparo de alertas via SMS.

### Configuração do envio de SMS

O projeto está integrado ao [Textbelt](https://textbelt.com/) por padrão:

- Sem configurar nada, usa a chave pública `textbelt`, que permite **1 SMS gratuito por dia**.
- Para aumentar o limite (créditos pagos), defina sua chave própria em `.env.local`:

  ```
  VITE_SMS_API_KEY=sua_chave_textbelt
  ```

- Se preferir outro provedor, basta trocar a URL no mesmo arquivo:

  ```
  VITE_SMS_API_URL=https://sua-api-sms.example.com/messages
  VITE_SMS_API_KEY=sua_chave
  ```

  O helper envia uma requisição `POST` com `Content-Type: application/x-www-form-urlencoded`, contendo `phone`, `message` e `key`. Adapte conforme o serviço escolhido.

## API Backend (Node + Express)

O repositório inclui uma API simples (pasta `server/`) que persiste usuários e tarefas em **SQLite** (ficheiro `database.sqlite` por omissão) ou em **PostgreSQL** quando `DATABASE_URL` está definida. Com ela, as alterações ficam disponíveis para todos os dispositivos ligados ao mesmo backend.

### Rodando a API localmente

```bash
cd server
npm install
npm run dev
```

Por padrão, a API roda em `http://localhost:3333` (ajuste a variável `PORT` se necessário). No primeiro carregamento, um usuário administrador padrão é criado automaticamente:

| E-mail      | Senha    |
| ----------- | -------- |
| admin@local | admin123 |

### Apontando o front-end para a API

Na raiz do projeto, em `.env`, use `VITE_API_URL` para o build de produção. Em desenvolvimento (`npm run dev`), o Vite encaminha `/api` para `localhost:3333` automaticamente.

```
VITE_API_URL=http://localhost:3333
```

Com isso, usuários e tarefas serão sincronizados entre todos os navegadores que consumirem a mesma API.

## Deploy na Vercel (projeto completo)

O repositório está preparado para **front + API no mesmo projeto** na Vercel:

- **PWA**: build estático (`dist/`).
- **API**: função serverless em `api/index.mjs` (Express), atendendo `/api/*`.
- **Banco**: **PostgreSQL** via `DATABASE_URL`. O ficheiro `database.sqlite` local **não** é usado na Vercel (serverless não persiste SQLite em disco de forma fiável).

### 1. Obter um PostgreSQL

Opções comuns (todas com tier gratuito ou de teste):

- **[Neon](https://neon.tech/)** — crie um projeto, copie a **connection string**; para serverless prefira o endpoint com **pooling** (PgBouncer), se o painel oferecer.
- **Storage → Postgres** no painel da [Vercel](https://vercel.com/docs/storage/vercel-postgres) — a Vercel preenche `POSTGRES_URL` / variáveis; use a URL que corresponde a conexão **direta** ou **pooled** conforme a documentação atual.
- **[Supabase](https://supabase.com/)** — em *Settings → Database* copie a URI (modo *transaction* costuma ser melhor para muitas ligações curtas).

Guarde a URI no formato `postgresql://...` (com `sslmode=require` se o fornecedor indicar).

### 2. Variáveis na Vercel

No projeto → **Settings → Environment Variables** (Production, Preview se quiser):

| Nome | Valor |
|------|--------|
| `DATABASE_URL` | Connection string PostgreSQL completa |
| `JWT_SECRET` | String longa e aleatória (não partilhe) |
| `ALLOWED_ORIGINS` | (Opcional) `https://seu-app.vercel.app` — se vazio, CORS aceita qualquer origem (útil só para testes) |

**Não** é obrigatório definir `VITE_API_URL`: em produção o front chama `/api/...` no **mesmo domínio** da Vercel.

Se a Vercel criar `POSTGRES_URL` em vez de `DATABASE_URL`, pode duplicar o valor em `DATABASE_URL` ou definir na Vercel `DATABASE_URL` com o mesmo conteúdo que a documentação do Storage recomendar para a função serverless.

### 3. Conectar e publicar

1. [vercel.com](https://vercel.com) → **Add New** → **Project** → importe o repositório.
2. **Root Directory**: raiz (onde está o `package.json` do front).
3. Confirme build `npm run build` e saída `dist` (já em `vercel.json`).
4. Adicione as variáveis acima e faça **Deploy**.

No primeiro acesso à API com banco vazio, é criado o admin padrão (`admin@local` / `admin123`, ou o que você definir com `BOOTSTRAP_ADMIN_EMAIL` / `BOOTSTRAP_ADMIN_PASSWORD`).

### 4. Importar backup JSON para o PostgreSQL

Na sua máquina, com `DATABASE_URL` apontando para o mesmo banco:

```bash
cd server
npm install
set DATABASE_URL=postgresql://...
set IMPORT_DEFAULT_PASSWORD=senhaParaUsuariosImportados
npm run import-firestore -- caminho\para\backup.json
```

(Sem `DATABASE_URL`, o import continua a usar **SQLite** local em `server/database.sqlite`.)

### Desenvolvimento local

- Front: `npm run dev` (proxy `/api` → `localhost:3333`).
- API: `cd server && npm run dev` — por omissão usa **`server/database.sqlite`** (LibSQL). Para testar contra Postgres local ou remoto, defina `DATABASE_URL` no ambiente antes de `npm run dev`.

### API em outro host (opcional)

Se preferir manter só o front na Vercel e a API em Render/Railway etc., defina **`VITE_API_URL`** na Vercel com a URL da API e configure **`ALLOWED_ORIGINS`** nessa API com a URL do front.

Arquivos: `vercel.json`, `api/index.mjs`, `.vercelignore`.

Para um passo a passo mais longo (Neon, variáveis, erros comuns, import JSON), vê **[DEPLOY.md](./DEPLOY.md)**.
