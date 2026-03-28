import type { Status, Tarefa } from '../types'

/** Soma segundos já acumulados + sessão atual em "Em andamento" (se houver). */
export function segundosTotaisCronometro(tarefa: Tarefa, agora: Date = new Date()): number {
  let seg = tarefa.cronometroSegundosAcumulados ?? 0
  if (tarefa.status === 'EM ANDAMENTO' && tarefa.cronometroInicioEm) {
    const ms = agora.getTime() - Date.parse(tarefa.cronometroInicioEm)
    if (ms > 0) seg += Math.floor(ms / 1000)
  }
  return seg
}

export function formatarDuracao(segundos: number): string {
  const s = Math.max(0, Math.floor(segundos))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
  return `${m}:${String(sec).padStart(2, '0')}`
}

export function segundosParaHoras(seg: number): number {
  return Math.round((seg / 3600) * 100) / 100
}

/**
 * Fecha a sessão atual (se estiver em "Em andamento") e devolve segundos acumulados totais.
 */
function mergeSessaoAtual(tarefa: Tarefa, agora: Date): number {
  return segundosTotaisCronometro(tarefa, agora)
}

export type ResultadoMudancaStatusCronometro = {
  patch: Partial<Tarefa>
  /** Precisa abrir modal de tempo (conclusão sem tempo de cronômetro nem manual) */
  precisaModalTempo: boolean
  /** Ao cancelar o modal, restaurar estes campos + status */
  snapshotAntesConclusao?: Pick<
    Tarefa,
    'status' | 'cronometroSegundosAcumulados' | 'cronometroInicioEm' | 'tempoTrabalhadoHoras'
  >
  /** Remover campo cronometroInicioEm no Firestore */
  removerCronometroInicio: boolean
}

/**
 * Regras: ir para "Em andamento" inicia/reinicia o tick; "Pausado" ou "Concluído" pausa.
 * Em "Concluído", preenche tempo trabalhado automaticamente a partir dos segundos (se > 0).
 */
export function calcularMudancaStatusCronometro(
  tarefa: Tarefa,
  novoStatus: Status,
  agora: Date = new Date()
): ResultadoMudancaStatusCronometro {
  const seg = mergeSessaoAtual(tarefa, agora)

  const snapshotAntesConclusao: NonNullable<ResultadoMudancaStatusCronometro['snapshotAntesConclusao']> =
    {
      status: tarefa.status,
      cronometroSegundosAcumulados: tarefa.cronometroSegundosAcumulados,
      cronometroInicioEm: tarefa.cronometroInicioEm,
      tempoTrabalhadoHoras: tarefa.tempoTrabalhadoHoras
    }

  if (novoStatus === 'EM ANDAMENTO') {
    return {
      patch: {
        status: 'EM ANDAMENTO',
        cronometroSegundosAcumulados: seg,
        cronometroInicioEm: agora.toISOString()
      },
      precisaModalTempo: false,
      removerCronometroInicio: false
    }
  }

  const patch: Partial<Tarefa> = {
    status: novoStatus,
    cronometroSegundosAcumulados: seg
  }

  let precisaModalTempo = false

  if (novoStatus === 'CONCLUIDO') {
    if (seg > 0) {
      patch.tempoTrabalhadoHoras = segundosParaHoras(seg)
      patch.cronometroSegundosAcumulados = 0
    } else if (
      tarefa.tempoTrabalhadoHoras != null &&
      !Number.isNaN(tarefa.tempoTrabalhadoHoras as number)
    ) {
      patch.tempoTrabalhadoHoras = tarefa.tempoTrabalhadoHoras
    } else {
      precisaModalTempo = true
    }
  }

  return {
    patch,
    precisaModalTempo,
    snapshotAntesConclusao:
      novoStatus === 'CONCLUIDO' && precisaModalTempo ? snapshotAntesConclusao : undefined,
    removerCronometroInicio: true
  }
}
