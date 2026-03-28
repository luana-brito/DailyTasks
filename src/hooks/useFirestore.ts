import { useEffect, useState } from 'react'
import {
  collection,
  onSnapshot,
  query,
  where,
  Timestamp
} from 'firebase/firestore'
import { db, firebaseInitError } from '../services/firebase'
import type { Tarefa, Usuario, Produto, SolicitacaoCadastro } from '../types'

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
    if (!db) {
      setData([])
      setError(firebaseInitError ?? 'Firebase indisponível.')
      setLoading(false)
      return
    }

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
            login: docData.login ?? docData.email ?? '',
            nome: docData.nome ?? '',
            email: docData.email ?? '',
            telefone: docData.telefone ?? '',
            status: docData.status ?? 'ATIVO',
            role: docData.role ?? 'USUARIO',
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

const PRIORIDADE_ORDEM: Record<string, number> = { ALTA: 0, MEDIA: 1, BAIXA: 2 }

export function useTarefas(): UseCollectionResult<Tarefa> {
  const [data, setData] = useState<Tarefa[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!db) {
      setData([])
      setError(firebaseInitError ?? 'Firebase indisponível.')
      setLoading(false)
      return
    }

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
            produto: docData.produto ?? '',
            status: docData.status ?? 'NOVO',
            prioridade: docData.prioridade ?? 'MEDIA',
            tempoTrabalhadoHoras: docData.tempoTrabalhadoHoras,
            observacoes: docData.observacoes,
            data: docData.data ?? new Date().toISOString().slice(0, 10),
            atribuidoIds: docData.atribuidoIds ?? [],
            criadoPorId: docData.criadoPorId ?? '',
            parentId: typeof docData.parentId === 'string' ? docData.parentId : undefined,
            cronometroSegundosAcumulados:
              typeof docData.cronometroSegundosAcumulados === 'number'
                ? docData.cronometroSegundosAcumulados
                : undefined,
            cronometroInicioEm:
              typeof docData.cronometroInicioEm === 'string' && docData.cronometroInicioEm
                ? docData.cronometroInicioEm
                : undefined,
            criadaEm: timestampToISO(docData.criadaEm),
            atualizadaEm: timestampToISO(docData.atualizadaEm),
          } as Tarefa
        })
        items.sort((a, b) => {
          const prioridadeA = PRIORIDADE_ORDEM[a.prioridade] ?? 1
          const prioridadeB = PRIORIDADE_ORDEM[b.prioridade] ?? 1
          if (prioridadeA !== prioridadeB) return prioridadeA - prioridadeB
          return new Date(b.atualizadaEm).getTime() - new Date(a.atualizadaEm).getTime()
        })
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

export function useProdutos(): UseCollectionResult<Produto> {
  const [data, setData] = useState<Produto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!db) {
      setData([])
      setError(firebaseInitError ?? 'Firebase indisponível.')
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    const collectionRef = collection(db, 'produtos')
    const q = query(collectionRef)

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const items = snapshot.docs.map((doc) => {
          const docData = doc.data()
          return {
            id: doc.id,
            nome: docData.nome ?? '',
            executiva: docData.executiva,
            ativo: docData.ativo ?? true,
            criadoEm: timestampToISO(docData.criadoEm),
            atualizadoEm: timestampToISO(docData.atualizadoEm)
          } as Produto
        })
        items.sort((a, b) => {
          if (a.nome === 'PESSOAL') return -1
          if (b.nome === 'PESSOAL') return 1
          return a.nome.localeCompare(b.nome, 'pt-BR')
        })
        setData(items)
        setLoading(false)
      },
      (err) => {
        console.error('Erro ao escutar produtos:', err)
        setError(err.message)
        setLoading(false)
      }
    )

    return () => unsubscribe()
  }, [])

  return { data, loading, error }
}

export function useSolicitacoesCadastro(): UseCollectionResult<SolicitacaoCadastro> {
  const [data, setData] = useState<SolicitacaoCadastro[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!db) {
      setData([])
      setError(firebaseInitError ?? 'Firebase indisponível.')
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    const collectionRef = collection(db, 'solicitacoes_cadastro')
    const q = query(collectionRef, where('status', '==', 'PENDENTE'))

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const items = snapshot.docs.map((doc) => {
          const docData = doc.data()
          return {
            id: doc.id,
            nome: docData.nome ?? '',
            email: docData.email ?? '',
            telefone: docData.telefone ?? '',
            motivo: docData.motivo ?? '',
            status: docData.status ?? 'PENDENTE',
            criadoEm: timestampToISO(docData.criadoEm),
            atualizadoEm: timestampToISO(docData.atualizadoEm)
          } as SolicitacaoCadastro
        })
        items.sort((a, b) => 
          new Date(a.criadoEm).getTime() - new Date(b.criadoEm).getTime()
        )
        setData(items)
        setLoading(false)
      },
      (err) => {
        console.error('Erro ao escutar solicitações:', err)
        setError(err.message)
        setLoading(false)
      }
    )

    return () => unsubscribe()
  }, [])

  return { data, loading, error }
}
