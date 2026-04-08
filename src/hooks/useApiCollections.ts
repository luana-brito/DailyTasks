import { useEffect, useState } from 'react'
import {
  fetchUsuarios,
  fetchTarefas,
  fetchProdutos,
  fetchSolicitacoesPendentes
} from '../services/api'
import type { Tarefa, Usuario, Produto, SolicitacaoCadastro } from '../types'

/** Hooks que sincronizam listas com a API local (polling). */

interface UseCollectionResult<T> {
  data: T[]
  loading: boolean
  error: string | null
}

const POLL_MS = 2500

const PRIORIDADE_ORDEM: Record<string, number> = { ALTA: 0, MEDIA: 1, BAIXA: 2 }

export function useUsuarios(usuario: Usuario | null): UseCollectionResult<Usuario> {
  const [data, setData] = useState<Usuario[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!usuario) {
      setData([])
      setError(null)
      setLoading(false)
      return
    }

    let cancel = false

    async function load() {
      try {
        const items = await fetchUsuarios()
        if (cancel) return
        items.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
        setData(items)
        setError(null)
      } catch (err) {
        if (cancel) return
        console.error('Erro ao carregar usuários:', err)
        setError(err instanceof Error ? err.message : 'Erro ao carregar usuários.')
      } finally {
        if (!cancel) setLoading(false)
      }
    }

    load()
    const t = setInterval(load, POLL_MS)
    return () => {
      cancel = true
      clearInterval(t)
    }
  }, [usuario?.id])

  return { data, loading, error }
}

export function useTarefas(usuario: Usuario | null): UseCollectionResult<Tarefa> {
  const [data, setData] = useState<Tarefa[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!usuario) {
      setData([])
      setError(null)
      setLoading(false)
      return
    }

    let cancel = false

    async function load() {
      try {
        const items = await fetchTarefas()
        if (cancel) return
        items.sort((a, b) => {
          const prioridadeA = PRIORIDADE_ORDEM[a.prioridade] ?? 1
          const prioridadeB = PRIORIDADE_ORDEM[b.prioridade] ?? 1
          if (prioridadeA !== prioridadeB) return prioridadeA - prioridadeB
          return new Date(b.atualizadaEm).getTime() - new Date(a.atualizadaEm).getTime()
        })
        setData(items)
        setError(null)
      } catch (err) {
        if (cancel) return
        console.error('Erro ao carregar tarefas:', err)
        setError(err instanceof Error ? err.message : 'Erro ao carregar tarefas.')
      } finally {
        if (!cancel) setLoading(false)
      }
    }

    load()
    const t = setInterval(load, POLL_MS)
    return () => {
      cancel = true
      clearInterval(t)
    }
  }, [usuario?.id])

  return { data, loading, error }
}

export function useProdutos(usuario: Usuario | null): UseCollectionResult<Produto> {
  const [data, setData] = useState<Produto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!usuario) {
      setData([])
      setError(null)
      setLoading(false)
      return
    }

    let cancel = false

    async function load() {
      try {
        const items = await fetchProdutos()
        if (cancel) return
        items.sort((a, b) => {
          if (a.nome === 'PESSOAL') return -1
          if (b.nome === 'PESSOAL') return 1
          return a.nome.localeCompare(b.nome, 'pt-BR')
        })
        setData(items)
        setError(null)
      } catch (err) {
        if (cancel) return
        console.error('Erro ao carregar produtos:', err)
        setError(err instanceof Error ? err.message : 'Erro ao carregar produtos.')
      } finally {
        if (!cancel) setLoading(false)
      }
    }

    load()
    const t = setInterval(load, POLL_MS)
    return () => {
      cancel = true
      clearInterval(t)
    }
  }, [usuario?.id])

  return { data, loading, error }
}

export function useSolicitacoesCadastro(usuario: Usuario | null): UseCollectionResult<SolicitacaoCadastro> {
  const [data, setData] = useState<SolicitacaoCadastro[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!usuario || usuario.role !== 'ADMIN') {
      setData([])
      setError(null)
      setLoading(false)
      return
    }

    let cancel = false

    async function load() {
      try {
        const items = await fetchSolicitacoesPendentes()
        if (cancel) return
        items.sort((a, b) => new Date(a.criadoEm).getTime() - new Date(b.criadoEm).getTime())
        setData(items)
        setError(null)
      } catch (err) {
        if (cancel) return
        console.error('Erro ao carregar solicitações:', err)
        setError(err instanceof Error ? err.message : 'Erro ao carregar solicitações.')
      } finally {
        if (!cancel) setLoading(false)
      }
    }

    load()
    const t = setInterval(load, POLL_MS)
    return () => {
      cancel = true
      clearInterval(t)
    }
  }, [usuario?.id, usuario?.role])

  return { data, loading, error }
}
