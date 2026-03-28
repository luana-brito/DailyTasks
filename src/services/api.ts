import {
  collection,
  doc,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  deleteField,
  serverTimestamp
} from 'firebase/firestore'
import { db } from './firebase'
import type { Tarefa, Usuario, Produto, SolicitacaoCadastro } from '../types'

function firestoreDb() {
  if (!db) {
    throw new Error(
      'Firebase não configurado. Crie o arquivo .env na raiz do projeto (veja .env.example).'
    )
  }
  return db
}

const removeUndefined = <T extends Record<string, unknown>>(obj: T): Partial<T> => {
  const result: Partial<T> = {}
  for (const key in obj) {
    if (obj[key] !== undefined) {
      result[key] = obj[key]
    }
  }
  return result
}

// Usuários --------------------------------------------------------------------

export type CriarUsuarioPayload = Omit<Usuario, 'id' | 'criadoEm' | 'atualizadoEm'>

export async function criarUsuarioFirestore(
  uid: string,
  payload: CriarUsuarioPayload
): Promise<Usuario> {
  const usuarioRef = doc(firestoreDb(), 'usuarios', uid)
  
  const dadosLimpos = removeUndefined(payload)
  
  await setDoc(usuarioRef, {
    ...dadosLimpos,
    criadoEm: serverTimestamp(),
    atualizadoEm: serverTimestamp()
  })

  const now = new Date().toISOString()
  return {
    id: uid,
    ...payload,
    criadoEm: now,
    atualizadoEm: now
  }
}

export type AtualizarUsuarioPayload = Partial<
  Omit<Usuario, 'id' | 'criadoEm' | 'atualizadoEm'>
>

export async function atualizarUsuarioApi(
  id: string,
  payload: AtualizarUsuarioPayload
): Promise<void> {
  const usuarioRef = doc(firestoreDb(), 'usuarios', id)
  
  const dadosLimpos = removeUndefined(payload)
  
  await updateDoc(usuarioRef, {
    ...dadosLimpos,
    atualizadoEm: serverTimestamp()
  })
}

export async function removerUsuarioApi(id: string): Promise<void> {
  const usuarioRef = doc(firestoreDb(), 'usuarios', id)
  await deleteDoc(usuarioRef)
}

// Tarefas ---------------------------------------------------------------------

export type CriarTarefaPayload = Omit<Tarefa, 'id' | 'criadaEm' | 'atualizadaEm'>

export async function criarTarefaApi(payload: CriarTarefaPayload): Promise<Tarefa> {
  const tarefasRef = collection(firestoreDb(), 'tarefas')
  
  const dadosLimpos = removeUndefined(payload)
  
  const docRef = await addDoc(tarefasRef, {
    ...dadosLimpos,
    criadaEm: serverTimestamp(),
    atualizadaEm: serverTimestamp()
  })

  const now = new Date().toISOString()
  return {
    id: docRef.id,
    ...payload,
    criadaEm: now,
    atualizadaEm: now
  }
}

export type AtualizarTarefaPayload = Partial<Omit<Tarefa, 'id' | 'criadaEm' | 'atualizadaEm'>>

export type OpcoesAtualizarTarefa = {
  /** Remove o campo `cronometroInicioEm` no Firestore (fim da sessão do cronômetro) */
  removerCronometroInicio?: boolean
  /** Remove `tempoTrabalhadoHoras` */
  removerTempoTrabalhado?: boolean
}

export async function atualizarTarefaApi(
  id: string,
  payload: AtualizarTarefaPayload,
  opcoes?: OpcoesAtualizarTarefa
): Promise<Tarefa> {
  const tarefaRef = doc(firestoreDb(), 'tarefas', id)

  const dadosLimpos = removeUndefined(payload as Record<string, unknown>) as Record<string, unknown>
  if (opcoes?.removerCronometroInicio) {
    dadosLimpos.cronometroInicioEm = deleteField()
  }
  if (opcoes?.removerTempoTrabalhado) {
    dadosLimpos.tempoTrabalhadoHoras = deleteField()
  }

  await updateDoc(tarefaRef, {
    ...dadosLimpos,
    atualizadaEm: serverTimestamp()
  })

  return {
    id,
    ...payload,
    criadaEm: new Date().toISOString(),
    atualizadaEm: new Date().toISOString()
  } as Tarefa
}

export async function removerTarefaApi(id: string): Promise<void> {
  const tarefaRef = doc(firestoreDb(), 'tarefas', id)
  await deleteDoc(tarefaRef)
}

// Produtos --------------------------------------------------------------------

export type CriarProdutoPayload = Omit<Produto, 'id' | 'criadoEm' | 'atualizadoEm'>

export async function criarProdutoApi(payload: CriarProdutoPayload): Promise<Produto> {
  const produtosRef = collection(firestoreDb(), 'produtos')
  
  const dadosLimpos = removeUndefined(payload)
  
  const docRef = await addDoc(produtosRef, {
    ...dadosLimpos,
    criadoEm: serverTimestamp(),
    atualizadoEm: serverTimestamp()
  })

  const now = new Date().toISOString()
  return {
    id: docRef.id,
    ...payload,
    criadoEm: now,
    atualizadoEm: now
  }
}

export type AtualizarProdutoPayload = Partial<Omit<Produto, 'id' | 'criadoEm' | 'atualizadoEm'>>

export async function atualizarProdutoApi(
  id: string,
  payload: AtualizarProdutoPayload
): Promise<void> {
  const produtoRef = doc(firestoreDb(), 'produtos', id)
  
  const dadosLimpos = removeUndefined(payload)
  
  await updateDoc(produtoRef, {
    ...dadosLimpos,
    atualizadoEm: serverTimestamp()
  })
}

export async function removerProdutoApi(id: string): Promise<void> {
  const produtoRef = doc(firestoreDb(), 'produtos', id)
  await deleteDoc(produtoRef)
}

// Solicitações de Cadastro ----------------------------------------------------

export type CriarSolicitacaoPayload = Omit<SolicitacaoCadastro, 'id' | 'status' | 'criadoEm' | 'atualizadoEm'>

export async function criarSolicitacaoApi(payload: CriarSolicitacaoPayload): Promise<SolicitacaoCadastro> {
  const solicitacoesRef = collection(firestoreDb(), 'solicitacoes_cadastro')
  
  const dadosLimpos = removeUndefined(payload)
  
  const docRef = await addDoc(solicitacoesRef, {
    ...dadosLimpos,
    status: 'PENDENTE',
    criadoEm: serverTimestamp(),
    atualizadoEm: serverTimestamp()
  })

  const now = new Date().toISOString()
  return {
    id: docRef.id,
    ...payload,
    status: 'PENDENTE',
    criadoEm: now,
    atualizadoEm: now
  }
}

export async function atualizarSolicitacaoApi(
  id: string,
  status: SolicitacaoCadastro['status']
): Promise<void> {
  const solicitacaoRef = doc(firestoreDb(), 'solicitacoes_cadastro', id)
  
  await updateDoc(solicitacaoRef, {
    status,
    atualizadoEm: serverTimestamp()
  })
}

export async function removerSolicitacaoApi(id: string): Promise<void> {
  const solicitacaoRef = doc(firestoreDb(), 'solicitacoes_cadastro', id)
  await deleteDoc(solicitacaoRef)
}
