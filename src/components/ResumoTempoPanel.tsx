import { formatarTempoHoraMinuto } from '../utils/tempoTrabalhado'
import { IconClock } from './Icons'

type ResumoTempoPanelProps = {
  horasDia: number
  horasSemana: number
  horasMes: number
  semanaInicio: string
  semanaFim: string
  mesAno: string
}

function formatarDataCurta(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  if (!y || !m || !d) return iso
  return new Date(y, m - 1, d).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
}

function rotuloMes(isoMes: string): string {
  const [y, m] = isoMes.split('-').map(Number)
  if (!y || !m) return isoMes
  return new Date(y, m - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
}

export function ResumoTempoPanel({
  horasDia,
  horasSemana,
  horasMes,
  semanaInicio,
  semanaFim,
  mesAno
}: ResumoTempoPanelProps) {
  const periodoSemana = `${formatarDataCurta(semanaInicio)} – ${formatarDataCurta(semanaFim)}`

  return (
    <section className="tempo-resumo-panel" aria-label="Tempo trabalhado acumulado">
      <div className="tempo-resumo-panel-head">
        <IconClock size={18} className="tempo-resumo-panel-ico" aria-hidden />
        <span className="tempo-resumo-panel-titulo">Tempo registrado</span>
        <span className="tempo-resumo-panel-sub">
          Soma do campo &quot;Tempo trabalhado&quot; das tarefas que obedecem aos filtros (inclui subtarefas).
        </span>
      </div>
      <div className="tempo-resumo-grid">
        <div className="tempo-resumo-card">
          <span className="tempo-resumo-label">Dia (data selecionada)</span>
          <span className="tempo-resumo-valor">{formatarTempoHoraMinuto(horasDia)}</span>
        </div>
        <div className="tempo-resumo-card">
          <span className="tempo-resumo-label">Semana</span>
          <span className="tempo-resumo-valor">{formatarTempoHoraMinuto(horasSemana)}</span>
          <span className="tempo-resumo-hint">{periodoSemana}</span>
        </div>
        <div className="tempo-resumo-card">
          <span className="tempo-resumo-label">Mês</span>
          <span className="tempo-resumo-valor">{formatarTempoHoraMinuto(horasMes)}</span>
          <span className="tempo-resumo-hint">{rotuloMes(mesAno)}</span>
        </div>
      </div>
    </section>
  )
}
