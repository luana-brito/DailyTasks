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
- Sincronização entre dispositivos via API Node (Express + SQLite)
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

O repositório inclui uma API simples (pasta `server/`) que persiste usuários e tarefas em um banco SQLite (`database.sqlite`). Com ela, as alterações ficam disponíveis para todos os dispositivos conectados ao mesmo backend.

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
- **Banco**: [Turso](https://turso.tech/) (SQLite na nuvem, plano gratuito). O arquivo `database.sqlite` local **não** é usado na Vercel.

### 1. Criar o banco na Turso

1. Instale a CLI: [Turso CLI](https://docs.turso.tech/cli/introduction) ou use o painel em [turso.tech](https://turso.tech/).
2. `turso auth login`
3. `turso db create dailytasks` (nome à sua escolha)
4. `turso db show dailytasks` → copie a **URL** (começa com `libsql://...`)
5. `turso db tokens create dailytasks` → copie o **token**

### 2. Variáveis na Vercel

No projeto → **Settings → Environment Variables** (Production, Preview se quiser):

| Nome | Valor |
|------|--------|
| `TURSO_DATABASE_URL` | URL `libsql://...` do passo acima |
| `TURSO_AUTH_TOKEN` | Token gerado |
| `JWT_SECRET` | String longa e aleatória (não compartilhe) |
| `ALLOWED_ORIGINS` | (Opcional) `https://seu-app.vercel.app` — se vazio, CORS aceita qualquer origem (útil só para testes) |

**Não** é obrigatório definir `VITE_API_URL`: em produção o front chama `/api/...` no **mesmo domínio** da Vercel.

### 3. Conectar e publicar

1. [vercel.com](https://vercel.com) → **Add New** → **Project** → importe o repositório.
2. **Root Directory**: raiz (onde está o `package.json` do front).
3. Confirme build `npm run build` e saída `dist` (já em `vercel.json`).
4. Adicione as variáveis acima e faça **Deploy**.

No primeiro acesso à API com banco vazio, é criado o admin padrão (`admin@local` / `admin123`, ou o que você definir com `BOOTSTRAP_ADMIN_EMAIL` / `BOOTSTRAP_ADMIN_PASSWORD`).

### 4. Importar backup JSON na Turso

Na sua máquina, com as variáveis `TURSO_*` apontando para o mesmo banco:

```bash
cd server
npm install
set TURSO_DATABASE_URL=...
set TURSO_AUTH_TOKEN=...
set IMPORT_DEFAULT_PASSWORD=senhaParaUsuariosImportados
npm run import-firestore -- caminho\para\backup.json
```

### Desenvolvimento local

- Front: `npm run dev` (proxy `/api` → `localhost:3333`).
- API: `cd server && npm run dev` — usa arquivo **`server/database.sqlite`** via LibSQL (não precisa de Turso).

### API em outro host (opcional)

Se preferir manter só o front na Vercel e a API em Render/Railway etc., defina **`VITE_API_URL`** na Vercel com a URL da API e configure **`ALLOWED_ORIGINS`** nessa API com a URL do front.

Arquivos: `vercel.json`, `api/index.mjs`, `.vercelignore`.
