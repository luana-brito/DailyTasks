import { useEffect, useState } from 'react'
import {
  collection,
  onSnapshot,
  query,
  Timestamp
} from 'firebase/firestore'
import { db } from '../services/firebase'
import type { Tarefa, Usuario } from '../types'

interface UseCollectionResult<T> {
  data: T[]
  loading: boolean
  error: string | null
}

const timestampToISO = (value: unknown): string => {
  if (value instanceof Timestamp) {
    return value.toDate().toISOString()
  }
  if (typeof value === 'string') {
    return value
  }
  return new Date().toISOString()
}

export function useUsuarios(): UseCollectionResult<Usuario> {
  const [data, setData] = useState<Usuario[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    setError(null)

    const collectionRef = collection(db, 'usuarios')
    const q = query(collectionRef)

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const items = snapshot.docs.map((doc) => {
          const docData = doc.data()
          return {
            id: doc.id,
            login: docData.login ?? '',
            nome: docData.nome ?? '',
            email: docData.email ?? '',
            telefone: docData.telefone ?? '',
            status: docData.status ?? 'ATIVO',
            role: docData.role ?? 'USUARIO',
            senhaHash: docData.senhaHash ?? '',
            criadoEm: timestampToISO(docData.criadoEm),
            atualizadoEm: timestampToISO(docData.atualizadoEm)
          } as Usuario
        })
        items.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
        setData(items)
        setLoading(false)
      },
      (err) => {
        console.error('Erro ao escutar usuarios:', err)
        setError(err.message)
        setLoading(false)
      }
    )

    return () => unsubscribe()
  }, [])

  return { data, loading, error }
}

export function useTarefas(): UseCollectionResult<Tarefa> {
  const [data, setData] = useState<Tarefa[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    setError(null)

    const collectionRef = collection(db, 'tarefas')
    const q = query(collectionRef)

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const items = snapshot.docs.map((doc) => {
          const docData = doc.data()
          return {
            id: doc.id,
            titulo: docData.titulo ?? '',
            produto: docData.produto ?? 'GESTÃO',
            status: docData.status ?? 'NOVO',
            tempoTrabalhadoHoras: docData.tempoTrabalhadoHoras,
            observacoes: docData.observacoes,
            data: docData.data ?? new Date().toISOString().slice(0, 10),
            atribuidoIds: docData.atribuidoIds ?? [],
            criadaEm: timestampToISO(docData.criadaEm),
            atualizadaEm: timestampToISO(docData.atualizadaEm)
          } as Tarefa
        })
        items.sort((a, b) => 
          new Date(b.atualizadaEm).getTime() - new Date(a.atualizadaEm).getTime()
        )
        setData(items)
        setLoading(false)
      },
      (err) => {
        console.error('Erro ao escutar tarefas:', err)
        setError(err.message)
        setLoading(false)
      }
    )

    return () => unsubscribe()
  }, [])

  return { data, loading, error }
}
