import { useEffect, useState } from 'react'
import type { Tarefa } from '../types'
import { segundosTotaisCronometro } from '../lib/cronometro'

/** Atualiza a cada segundo enquanto a tarefa estiver em "Em andamento" com sessão ativa. */
export function useSegundosCronometroVisivel(tarefa: Tarefa): number {
  const [, setTick] = useState(0)

  useEffect(() => {
    if (tarefa.status !== 'EM ANDAMENTO' || !tarefa.cronometroInicioEm) return

    const id = window.setInterval(() => setTick((n) => n + 1), 1000)
    return () => window.clearInterval(id)
  }, [tarefa.status, tarefa.cronometroInicioEm, tarefa.id])

  return segundosTotaisCronometro(tarefa, new Date())
}
