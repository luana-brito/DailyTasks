# Configuração do Firebase

Este guia explica como configurar o Firebase para sincronização em tempo real entre dispositivos.

## 1. Criar Projeto no Firebase

1. Acesse [Firebase Console](https://console.firebase.google.com)
2. Clique em **Adicionar projeto**
3. Digite um nome para o projeto (ex: "daily-pwa")
4. Desative o Google Analytics (opcional)
5. Clique em **Criar projeto**

## 2. Configurar Firestore Database

1. No menu lateral, clique em **Firestore Database**
2. Clique em **Criar banco de dados**
3. Selecione **Iniciar no modo de teste** (para desenvolvimento)
4. Escolha a localização mais próxima (ex: `southamerica-east1` para Brasil)
5. Clique em **Ativar**

## 3. Registrar App Web

1. Na página inicial do projeto, clique no ícone **Web** (`</>`)
2. Digite um apelido para o app (ex: "daily-pwa-web")
3. Clique em **Registrar app**
4. Copie as credenciais de configuração exibidas

## 4. Configurar Variáveis de Ambiente

Copie o arquivo `.env.example` para `.env`:

```bash
copy .env.example .env
```

Preencha o arquivo `.env` com as credenciais do Firebase:

```env
VITE_FIREBASE_API_KEY=AIzaSy...
VITE_FIREBASE_AUTH_DOMAIN=seu-projeto.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=seu-projeto-id
VITE_FIREBASE_STORAGE_BUCKET=seu-projeto.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abcdef123456
```

## 5. Instalar Dependências

Execute no terminal:

```bash
npm install
```

## 6. Regras de Segurança do Firestore

Para produção, configure regras mais restritivas no Firebase Console:

1. Vá para **Firestore Database** > **Regras**
2. Substitua as regras por:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /usuarios/{userId} {
      allow read: if true;
      allow write: if true;
    }
    
    match /tarefas/{tarefaId} {
      allow read: if true;
      allow write: if true;
    }
  }
}
```

> **Nota**: Para um ambiente de produção real, você deve implementar autenticação e regras mais restritivas.

## 7. Criar Índices (se necessário)

Se você receber erros sobre índices faltando, o Firebase mostrará um link no console do navegador para criar o índice automaticamente.

## 8. Testar Sincronização

1. Execute o app: `npm run dev`
2. Abra em dois navegadores/dispositivos diferentes
3. Crie uma tarefa em um dispositivo
4. Observe a atualização automática no outro dispositivo

## Estrutura do Banco de Dados

```
firestore/
├── usuarios/
│   └── {userId}/
│       ├── login: string
│       ├── nome: string
│       ├── email: string
│       ├── telefone: string
│       ├── status: "ATIVO" | "INATIVO"
│       ├── role: "ADMIN" | "USUARIO"
│       ├── senhaHash: string
│       ├── criadoEm: timestamp
│       └── atualizadoEm: timestamp
│
└── tarefas/
    └── {tarefaId}/
        ├── titulo: string
        ├── produto: string
        ├── status: "NOVO" | "EM ANDAMENTO" | "PAUSADO" | "CONCLUIDO"
        ├── tempoTrabalhadoHoras: number (opcional)
        ├── observacoes: string (opcional)
        ├── data: string (YYYY-MM-DD)
        ├── atribuidoIds: string[]
        ├── criadaEm: timestamp
        └── atualizadaEm: timestamp
```

## Migração de Dados Existentes

Se você tinha dados no backend anterior, precisará migrá-los manualmente para o Firestore. Você pode:

1. Exportar os dados do banco anterior
2. Usar o console do Firebase para importar
3. Ou criar um script de migração

## Custos

O Firebase tem um plano gratuito (Spark) generoso:
- 1 GB de armazenamento
- 50.000 leituras/dia
- 20.000 escritas/dia
- 20.000 exclusões/dia

Para a maioria dos casos de uso, isso é suficiente.
