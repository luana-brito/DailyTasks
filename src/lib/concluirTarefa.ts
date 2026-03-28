import type { Tarefa } from '../types'
import { atualizarTarefaApi } from '../services/api'
import { calcularMudancaStatusCronometro } from './cronometro'

export type PersistirConclusaoOpcoes = {
  /** Se faltar tempo/cronômetro, grava 0 h em vez de exigir modal */
  forcarTempoZeroSeNecessario?: boolean
}

/**
 * Persiste a tarefa como CONCLUIDA com as regras de cronômetro.
 * Não dispara lógica de “concluir tarefa mãe”.
 */
export async function persistirConclusaoTarefa(
  t: Tarefa,
  opcoes?: PersistirConclusaoOpcoes
): Promise<void> {
  const cron = calcularMudancaStatusCronometro(t, 'CONCLUIDO')
  const patch = { ...cron.patch }
  let remover = cron.removerCronometroInicio

  if (cron.precisaModalTempo && opcoes?.forcarTempoZeroSeNecessario) {
    patch.tempoTrabalhadoHoras = 0
    patch.cronometroSegundosAcumulados = 0
    remover = true
  }

  await atualizarTarefaApi(
    t.id,
    {
      titulo: t.titulo,
      produto: t.produto,
      prioridade: t.prioridade,
      observacoes: t.observacoes,
      data: t.data,
      atribuidoIds: t.atribuidoIds,
      ...patch
    },
    { removerCronometroInicio: remover }
  )
}
