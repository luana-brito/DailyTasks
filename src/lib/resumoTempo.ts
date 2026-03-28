import type { Filtros, Tarefa } from '../types'

function toISODataLocal(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** Segunda a domingo (local) que contém `dataRefISO` (YYYY-MM-DD). */
export function intervaloSemanaLocal(dataRefISO: string): { inicio: string; fim: string } {
  const partes = dataRefISO.split('-').map(Number)
  const y = partes[0]
  const mo = partes[1]
  const da = partes[2]
  if (!y || !mo || !da) {
    return { inicio: dataRefISO, fim: dataRefISO }
  }
  const data = new Date(y, mo - 1, da)
  const dow = data.getDay()
  const offsetSegunda = dow === 0 ? -6 : 1 - dow
  const seg = new Date(data)
  seg.setDate(seg.getDate() + offsetSegunda)
  const dom = new Date(seg)
  dom.setDate(dom.getDate() + 6)
  return { inicio: toISODataLocal(seg), fim: toISODataLocal(dom) }
}

export function somaTempoTrabalhadoHoras(tarefas: Tarefa[]): number {
  let s = 0
  for (const t of tarefas) {
    const h = t.tempoTrabalhadoHoras
    if (h == null || Number.isNaN(h)) continue
    s += h
  }
  return Math.round(s * 100) / 100
}

/** Mesmas regras de produto/status/atribuição da lista principal; inclui subtarefas. */
export function filtrarTarefasParaResumoTempo(
  tarefasVisiveis: Tarefa[],
  filtros: Filtros,
  usuarioLogadoId?: string
): Tarefa[] {
  const idsFiltro =
    filtros.atribuicoes === 'TODOS'
      ? null
      : filtros.atribuicoes === 'EU'
        ? usuarioLogadoId
          ? [usuarioLogadoId]
          : null
        : filtros.atribuicoes

  return tarefasVisiveis.filter((tarefa) => {
    const produtoOk = filtros.produto === 'TODOS' || tarefa.produto === filtros.produto
    const statusOk = filtros.status === 'TODOS' || tarefa.status === filtros.status
    const atribuicaoOk =
      !idsFiltro || idsFiltro.length === 0
        ? true
        : tarefa.atribuidoIds.some((id) => idsFiltro.includes(id))
    return produtoOk && statusOk && atribuicaoOk
  })
}

export function calcularResumoTempoPorPeriodo(
  tarefasFiltradas: Tarefa[],
  dataReferenciaISO: string
): {
  horasDia: number
  horasSemana: number
  horasMes: number
  semanaInicio: string
  semanaFim: string
  mesAno: string
} {
  const { inicio, fim } = intervaloSemanaLocal(dataReferenciaISO)
  const prefixoMes = dataReferenciaISO.slice(0, 7)

  const horasDia = somaTempoTrabalhadoHoras(
    tarefasFiltradas.filter((t) => t.data === dataReferenciaISO)
  )
  const horasSemana = somaTempoTrabalhadoHoras(
    tarefasFiltradas.filter((t) => t.data >= inicio && t.data <= fim)
  )
  const horasMes = somaTempoTrabalhadoHoras(
    tarefasFiltradas.filter((t) => t.data.startsWith(prefixoMes))
  )

  return {
    horasDia,
    horasSemana,
    horasMes,
    semanaInicio: inicio,
    semanaFim: fim,
    mesAno: prefixoMes
  }
}
