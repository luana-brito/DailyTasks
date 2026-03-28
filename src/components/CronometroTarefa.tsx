import type { Tarefa } from '../types'
import { formatarDuracao } from '../lib/cronometro'
import { useSegundosCronometroVisivel } from '../hooks/useCronometroTick'
import { IconClock } from './Icons'

type CronometroTarefaProps = {
  tarefa: Tarefa
  className?: string
}

export function CronometroTarefa({ tarefa, className }: CronometroTarefaProps) {
  const segundos = useSegundosCronometroVisivel(tarefa)
  const ativo = tarefa.status === 'EM ANDAMENTO' && Boolean(tarefa.cronometroInicioEm)
  const temAlgo = segundos > 0 || ativo

  if (!temAlgo) return null

  return (
    <span
      className={`cronometro-tarefa ${ativo ? 'cronometro-tarefa--ativo' : ''} ${className ?? ''}`.trim()}
      title="Tempo registrado no cronômetro"
    >
      <IconClock size={14} className="cronometro-tarefa-icon" aria-hidden />
      <span className="cronometro-tarefa-tempo">{formatarDuracao(segundos)}</span>
    </span>
  )
}
