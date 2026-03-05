import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp
} from 'firebase/firestore'
import { db } from './firebase'
import type { Tarefa, Usuario } from '../types'

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

export async function criarUsuarioApi(payload: CriarUsuarioPayload): Promise<Usuario> {
  const usuariosRef = collection(db, 'usuarios')
  
  const dadosLimpos = removeUndefined(payload)
  
  const docRef = await addDoc(usuariosRef, {
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

export type AtualizarUsuarioPayload = Partial<
  Omit<Usuario, 'id' | 'criadoEm' | 'atualizadoEm'>
> & {
  nome: string
  email: string
  telefone: string
  status: Usuario['status']
  role: Usuario['role']
}

export async function atualizarUsuarioApi(
  id: string,
  payload: AtualizarUsuarioPayload
): Promise<Usuario> {
  const usuarioRef = doc(db, 'usuarios', id)
  
  const dadosLimpos = removeUndefined(payload)
  
  await updateDoc(usuarioRef, {
    ...dadosLimpos,
    atualizadoEm: serverTimestamp()
  })

  return {
    id,
    login: payload.login ?? '',
    senhaHash: payload.senhaHash ?? '',
    ...payload,
    criadoEm: new Date().toISOString(),
    atualizadoEm: new Date().toISOString()
  } as Usuario
}

export async function removerUsuarioApi(id: string): Promise<void> {
  const usuarioRef = doc(db, 'usuarios', id)
  await deleteDoc(usuarioRef)
}

// Tarefas ---------------------------------------------------------------------

export type CriarTarefaPayload = Omit<Tarefa, 'id' | 'criadaEm' | 'atualizadaEm'>

export async function criarTarefaApi(payload: CriarTarefaPayload): Promise<Tarefa> {
  const tarefasRef = collection(db, 'tarefas')
  
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

export type AtualizarTarefaPayload = Omit<Tarefa, 'id' | 'criadaEm'>

export async function atualizarTarefaApi(
  id: string,
  payload: AtualizarTarefaPayload
): Promise<Tarefa> {
  const tarefaRef = doc(db, 'tarefas', id)
  
  const dadosLimpos = removeUndefined(payload)
  
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
  const tarefaRef = doc(db, 'tarefas', id)
  await deleteDoc(tarefaRef)
}
