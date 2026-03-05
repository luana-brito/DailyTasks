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
- Ao executar o app pela primeira vez é criado um usuário administrador padrão:

  | Login | Senha    | Observações                        |
  | ----- | -------- | ---------------------------------- |
  | admin | admin123 | Recomenda-se alterar após o login. |

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

| Login | Senha    |
| ----- | -------- |
| admin | admin123 |

### Apontando o front-end para a API

No projeto PWA (`pwa-daily/`), defina o endpoint em `.env.local` (opcional, o padrão já aponta para `http://localhost:3333`):

```
VITE_API_URL=http://localhost:3333
```

Com isso, usuários e tarefas serão sincronizados entre todos os navegadores que consumirem a mesma API.
