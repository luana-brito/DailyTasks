import { initializeApp, type FirebaseApp } from 'firebase/app'
import { getFirestore, type Firestore } from 'firebase/firestore'
import { getAuth, type Auth } from 'firebase/auth'

const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY as string | undefined,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string | undefined,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID as string | undefined,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET as string | undefined,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID as string | undefined,
  appId: import.meta.env.VITE_FIREBASE_APP_ID as string | undefined
}

function mensagemVariaveisAusentes(): string | null {
  const obrigatorias: (keyof typeof config)[] = [
    'apiKey',
    'projectId',
    'authDomain',
    'appId'
  ]
  const faltando = obrigatorias.filter((k) => !config[k] || String(config[k]).trim() === '')
  if (faltando.length === 0) return null
  return `Configure o Firebase: copie .env.example para .env na raiz do projeto e preencha as variáveis VITE_FIREBASE_* (faltando: ${faltando.join(', ')}).`
}

let mensagemInit: string | null = mensagemVariaveisAusentes()
let app: FirebaseApp | undefined

if (!mensagemInit) {
  try {
    app = initializeApp({
      apiKey: config.apiKey!,
      authDomain: config.authDomain!,
      projectId: config.projectId!,
      storageBucket: config.storageBucket,
      messagingSenderId: config.messagingSenderId,
      appId: config.appId!
    })
  } catch (err) {
    mensagemInit =
      err instanceof Error ? err.message : 'Não foi possível inicializar o Firebase.'
    app = undefined
  }
}

/** Mensagem amigável se o app não puder subir o Firebase (evita tela branca por erro na importação). */
export const firebaseInitError = mensagemInit

export const db: Firestore | null = app ? getFirestore(app) : null
export const auth: Auth | null = app ? getAuth(app) : null
