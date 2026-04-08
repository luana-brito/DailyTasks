# Tutorial: deploy na Vercel com PostgreSQL

Este guia explica, passo a passo, como publicar o **Diário de Tarefas** (front PWA + API Express na mesma Vercel) usando **PostgreSQL** na nuvem. Não é necessário Turso nem servidor próprio para a API.

---

## O que vai acontecer no final

- O site fica num URL do tipo `https://seu-projeto.vercel.app`.
- O mesmo domínio serve o **React** (ficheiros estáticos) e as rotas **`/api/...`** (função serverless).
- Os dados (utilizadores, tarefas, etc.) ficam numa base **PostgreSQL** (ex.: Neon), ligada pela variável **`DATABASE_URL`**.

---

## Pré-requisitos

1. Conta no [GitHub](https://github.com) com o código do projeto (repositório já enviado).
2. Conta na [Vercel](https://vercel.com) (podes usar “Continue with GitHub”).
3. Uma base PostgreSQL na nuvem — neste tutorial usamos **[Neon](https://neon.tech/)** (plano gratuito, simples). Alternativas: Postgres da Vercel (Storage), Supabase, Railway, etc.

---

## Parte 1 — Criar o PostgreSQL (Neon)

### 1.1 Registar e criar projeto

1. Acede a [https://neon.tech](https://neon.tech) e cria conta.
2. **Create a project** — escolhe região próxima dos utilizadores (ex.: `Frankfurt` para Europa).
3. O Neon cria uma base por defeito; anota o nome (ex.: `neondb`).

### 1.2 Copiar a connection string

1. No painel Neon, abre o projeto → **Dashboard**.
2. Secção **Connection details** (ou **Connect**).
3. Copia a URI que começa por `postgresql://` ou `postgres://`.
   - Deve incluir utilizador, palavra-passe, host e nome da base.
   - Se existir opção **Pooled** ou **Transaction** (PgBouncer), prefere essa para aplicações serverless com muitas ligações curtas — segue a recomendação do próprio Neon para “serverless” ou “Vercel”.
4. Guarda este valor num sítio seguro; vais colá-lo na Vercel como **`DATABASE_URL`**.

> **Importante:** não partilhes esta string nem a commits no Git. Ela contém a palavra-passe da base.

### 1.3 (Opcional) Criar a base a partir de zero

Não precisas de criar tabelas manualmente. Na **primeira execução** da API na Vercel, o código executa `CREATE TABLE IF NOT EXISTS` e, se não existir nenhum utilizador, cria o administrador inicial (ver Parte 3).

---

## Parte 2 — Ligar o repositório à Vercel

### 2.1 Importar o projeto

1. Vai a [https://vercel.com/new](https://vercel.com/new).
2. **Add New… → Project**.
3. **Import** o repositório GitHub (ex.: `luana-brito/DailyTasks`).
4. Se for a primeira vez, autoriza a Vercel a aceder aos repositórios.

### 2.2 Configurar o build

Confirma que a Vercel deteta o projeto corretamente:

| Campo | Valor esperado |
|--------|----------------|
| **Framework Preset** | Vite (ou “Other” se não detetar; o `vercel.json` já define o resto) |
| **Root Directory** | `.` (raiz do repo, onde está o `package.json` do front) |
| **Build Command** | `npm run build` (já costuma vir preenchido) |
| **Output Directory** | `dist` |

O ficheiro `vercel.json` no repositório já indica:

- build estático em `dist`;
- reescrita de `/api/*` para a função `api/index.mjs`.

Não alteres isto salvo se souberes o que estás a mudar.

### 2.3 Ainda não faças “Deploy”

Antes do primeiro deploy **em produção**, convém definir as variáveis de ambiente (Parte 3). Podes clicar em **Deploy** e depois acrescentar variáveis e **Redeploy**, ou configurar variáveis antes — o resultado final é o mesmo depois de um redeploy.

---

## Parte 3 — Variáveis de ambiente na Vercel

1. No projeto Vercel → **Settings** → **Environment Variables**.
2. Adiciona as seguintes variáveis (para **Production**; opcionalmente também **Preview** se quiseres URLs de PR a funcionarem igual):

| Nome | Descrição |
|------|-----------|
| **`DATABASE_URL`** | Cola a connection string completa do Neon (ou outro Postgres). |
| **`JWT_SECRET`** | Uma string longa e aleatória (ex.: 32+ caracteres). Usa um gerador de passwords ou `openssl rand -hex 32`. Não uses um valor de exemplo público. |

Opcionais mas úteis:

| Nome | Descrição |
|------|-----------|
| **`ALLOWED_ORIGINS`** | URL exata do teu site, ex.: `https://seu-projeto.vercel.app`. Se estiver vazio, a API aceita CORS de qualquer origem (aceitável só para testes). |
| **`BOOTSTRAP_ADMIN_EMAIL`** | E-mail do primeiro admin (se não quiseres o padrão). |
| **`BOOTSTRAP_ADMIN_PASSWORD`** | Senha inicial desse admin (altera depois do login). |

**Não precisas** de `VITE_API_URL` se o front e a API estão no mesmo domínio na Vercel (comportamento por defeito do projeto).

### Se usares Postgres integrado na Vercel

Às vezes a Vercel cria **`POSTGRES_URL`** em vez de `DATABASE_URL`**. Este projeto lê apenas **`DATABASE_URL`**. Solução: cria manualmente **`DATABASE_URL`** com o **mesmo valor** que a documentação da Vercel indicar para ligação à função serverless (muitas vezes a URL “pooled”).

### Remover variáveis antigas (Turso)

Se antes tinhas `TURSO_DATABASE_URL` / `TURSO_AUTH_TOKEN`, **remove-as** — já não são usadas.

---

## Parte 4 — Deploy e verificação

1. Na Vercel, **Deployments** → no último deploy, **⋯ → Redeploy** (se já tinhas feito deploy sem variáveis), ou faz **Deploy** de novo após guardar as variáveis.
2. Espera o build terminar (Build + Assigning domains).
3. Abre o URL de produção (ex.: `https://seu-projeto.vercel.app`).
4. Faz login com o admin por defeito, **se não mudaste** `BOOTSTRAP_ADMIN_*`:
   - **E-mail:** `admin@local`
   - **Senha:** `admin123`
5. **Altera a senha** em perfil / gestão de utilizadores assim que possível.

### Testar a API diretamente

- `GET https://seu-projeto.vercel.app/api/...` sem token pode devolver 401 nalgumas rotas — é normal.
- `POST /api/auth/login` com JSON `{ "email": "...", "password": "..." }` deve devolver `200` e um `token` se as credenciais estiverem corretas.

---

## Parte 5 — Problemas frequentes

### Erro 503 ou mensagem sobre `DATABASE_URL`

- A variável **`DATABASE_URL`** não está definida ou o deploy foi feito antes de a guardares → adiciona/edita a variável e faz **Redeploy**.

### Erro 500 no login sem mensagem clara

- Abre **Vercel → Project → Logs** (ou **Runtime Logs** da função serverless).
- Causas típicas: URI do Postgres incorreta, IP/firewall do Neon a bloquear (Neon costuma permitir tudo por defeito), ou palavra-passe da URI com caracteres especiais mal codificados na URL.

### 500 só nalgumas rotas (ex.: solicitações), às vezes depois de já ter funcionado

- Com **connection string “pooled”** (Neon, Supabase, etc.), o pooler (PgBouncer) em modo **transaction** não suporta bem *prepared statements* entre ligações. O cliente `postgres` do projeto usa **`prepare: false` por omissão** para evitar erros intermitentes. Se tiveres definido `PG_PREPARE=true` sem necessidade, remove essa variável e volta a fazer deploy.

### CORS no browser

- Define **`ALLOWED_ORIGINS`** exatamente com o URL do front (com `https://`, sem barra no fim), ou deixa vazio temporariamente para testar.

### PWA / cache antigo

- Após deploys grandes, faz um hard refresh ou testa em janela anónima. O `vercel.json` já reduz cache agressivo em ficheiros do service worker.

---

## Parte 6 — Importar dados de um backup JSON

Se tens um ficheiro exportado (formato esperado pelo script do projeto):

```bash
cd server
npm install
```

No Windows (PowerShell):

```powershell
$env:DATABASE_URL = "postgresql://..."
$env:IMPORT_DEFAULT_PASSWORD = "senhaTemporariaParaUsersImportados"
npm run import-firestore -- ..\caminho\para\backup.json
```

No macOS/Linux:

```bash
export DATABASE_URL="postgresql://..."
export IMPORT_DEFAULT_PASSWORD="senhaTemporariaParaUsersImportados"
npm run import-firestore -- ../caminho/para/backup.json
```

Sem `DATABASE_URL`, o script usa **SQLite local** (`server/database.sqlite`), não o Postgres da Vercel.

---

## Dados em produção vazios (utilizadores / tarefas do PC não aparecem)

Isto é **normal**: em desenvolvimento a app usa **`server/database.sqlite`** no teu computador. Na Vercel a app usa apenas o **PostgreSQL** da variável **`DATABASE_URL`** — é outra base, independente, que começa vazia (salvo o admin criado automaticamente).

Para **copiar** tudo do SQLite local para o Postgres de produção:

1. No painel Neon (ou outro), copia a **mesma** `DATABASE_URL` que está na Vercel.
2. Na tua máquina, na pasta do projeto:

   **PowerShell:**

   ```powershell
   $env:DATABASE_URL = "postgresql://..."   # cola a URI de produção
   cd server
   npm install
   npm run migrate:sqlite-to-pg
   ```

   **Ou a partir da raiz do repo:** `npm run migrate:sqlite-to-pg` (com `DATABASE_URL` definida no ambiente).

3. Opcional: `SOURCE_SQLITE_PATH` se o teu `.sqlite` não for `server/database.sqlite`.

4. Abre o site em produção e faz login com as **mesmas credenciais** que usavas no PC (os hashes de senha são copiados).

Se der erro de **e-mail duplicado** (`UNIQUE`), o Postgres já tinha um utilizador com o mesmo e-mail que um registo do SQLite (ex.: dois admins). Apaga ou altera um dos lados e volta a correr o comando.

---

## Resumo rápido (checklist)

- [ ] Postgres criado (ex.: Neon) e URI copiada  
- [ ] Repositório importado na Vercel, root = raiz do projeto  
- [ ] `DATABASE_URL` e `JWT_SECRET` definidos  
- [ ] Turso / variáveis antigas removidas  
- [ ] Redeploy concluído  
- [ ] Login com admin inicial e alteração de senha  

Para uma visão mais curta, vê também a secção **Deploy na Vercel** no `README.md`.
