function partesDeHorasDecimais(horasDecimais: number): { h: number; m: number } {
  const totalMin = Math.round(horasDecimais * 60)
  return {
    h: Math.floor(totalMin / 60),
    m: totalMin % 60
  }
}

/** Exibição em listas/cartões: HH:MM ou em dash se vazio */
export function formatarTempoHoraMinuto(horasDecimais?: number | null): string {
  if (horasDecimais == null || Number.isNaN(horasDecimais)) return '—'
  const { h, m } = partesDeHorasDecimais(horasDecimais)
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

/** Valor inicial do input texto HH:MM (vazio se não houver tempo) */
export function horasDecimaisParaStringHm(horasDecimais?: number | null): string {
  if (horasDecimais == null || Number.isNaN(horasDecimais)) return ''
  const { h, m } = partesDeHorasDecimais(horasDecimais)
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

/**
 * Interpreta string HH:MM (duração). Horas qualquer inteiro ≥ 0; minutos 00–59.
 * Vazio → undefined. Formato inválido → undefined.
 */
export function parseStringHmParaHorasDecimais(s: string): number | undefined {
  const t = s.trim()
  if (t === '') return undefined
  const match = /^(\d+)\s*:\s*(\d{1,2})$/.exec(t)
  if (!match) return undefined
  const h = parseInt(match[1], 10)
  const min = parseInt(match[2], 10)
  if (Number.isNaN(h) || Number.isNaN(min) || h < 0 || min > 59) return undefined
  return Math.round((h + min / 60) * 100) / 100
}
