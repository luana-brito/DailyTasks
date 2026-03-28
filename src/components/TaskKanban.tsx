import { useCallback, useMemo, useState, type DragEvent } from 'react'
import type { Status, Tarefa, Usuario } from '../types'
import { IconEdit, IconTrash, IconChevronRight, IconLayers } from './Icons'
import { SubtarefasDetalheList } from './SubtarefasDetalheList'
import { CronometroTarefa } from './CronometroTarefa'
import { formatarTempoHoraMinuto } from '../utils/tempoTrabalhado'

type TaskKanbanProps = {
  tarefas: Tarefa[]
  contagemSubtarefasPorTarefaId?: Record<string, { total: number; concluidas: number }>
  subtarefasPorParentId?: Record<string, Tarefa[]>
  onEditar: (tarefa: Tarefa) => void
  onExcluir: (id: string) => void
  onAlterarStatus: (id: string, status: Tarefa['status']) => void
  usuariosPorId: Record<string, Usuario>
}

type DragInfo = {
  tarefaId: string
}

const colunas: Status[] = ['NOVO', 'EM ANDAMENTO', 'PAUSADO', 'CONCLUIDO']

export function TaskKanban({
  tarefas,
  contagemSubtarefasPorTarefaId,
  subtarefasPorParentId,
  onEditar,
  onExcluir,
  onAlterarStatus,
  usuariosPorId
}: TaskKanbanProps) {
  const [dragInfo, setDragInfo] = useState<DragInfo | null>(null)
  const [expandidas, setExpandidas] = useState<Set<string>>(() => new Set())

  const alternarSubtarefas = useCallback((id: string) => {
    setExpandidas((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const colunasComTarefas = useMemo(() => {
    return colunas.map((coluna) => ({
      status: coluna,
      tarefas: tarefas.filter((tarefa) => tarefa.status === coluna)
    }))
  }, [tarefas])

  const handleDragStart = (evento: DragEvent<HTMLDivElement>, tarefaId: string) => {
    evento.dataTransfer.effectAllowed = 'move'
    setDragInfo({ tarefaId })
  }

  const handleDrop = (evento: DragEvent<HTMLDivElement>, status: Status) => {
    evento.preventDefault()
    if (dragInfo?.tarefaId) {
      onAlterarStatus(dragInfo.tarefaId, status)
    }
    setDragInfo(null)
  }

  return (
    <div className="kanban-wrapper">
      <div className="kanban">
        {colunasComTarefas.map(({ status, tarefas: tarefasDaColuna }) => (
          <div
            key={status}
            className="kanban-column"
            onDragOver={(evento) => evento.preventDefault()}
            onDrop={(evento) => handleDrop(evento, status)}
          >
            <header>
              <h3>{status}</h3>
              <span>{tarefasDaColuna.length}</span>
            </header>

            <div className="kanban-cards">
              {tarefasDaColuna.length === 0 && <p className="empty-column">Nenhuma tarefa</p>}

              {tarefasDaColuna.map((tarefa) => {
                const atribuicoes = tarefa.atribuidoIds
                  .map((id) => {
                    const usuario = usuariosPorId[id]
                    return usuario ? { id: usuario.id, nome: usuario.nome } : null
                  })
                  .filter((item): item is { id: string; nome: string } => Boolean(item))

                const subs = subtarefasPorParentId?.[tarefa.id] ?? []
                const temSubtarefas = subs.length > 0
                const aberto = expandidas.has(tarefa.id)
                const contagemSub = contagemSubtarefasPorTarefaId?.[tarefa.id]
                const pctSub =
                  contagemSub && contagemSub.total > 0
                    ? Math.round((100 * contagemSub.concluidas) / contagemSub.total)
                    : 0
                const subtarefasTodasOk =
                  Boolean(contagemSub && contagemSub.total > 0 && contagemSub.concluidas === contagemSub.total)

                return (
                  <div
                    key={tarefa.id}
                    className={`kanban-card ${tarefa.status === 'CONCLUIDO' ? 'concluido' : ''} ${temSubtarefas ? 'kanban-card-com-sub' : ''}`}
                    draggable={tarefa.status !== 'CONCLUIDO'}
                    onDragStart={(evento) => handleDragStart(evento, tarefa.id)}
                    onDragEnd={() => setDragInfo(null)}
                  >
                    <div className="kanban-card-headline">
                      {temSubtarefas && (
                        <button
                          type="button"
                          className={`kanban-collapse-toggle ${aberto ? 'aberto' : ''}`}
                          onClick={(e) => {
                            e.stopPropagation()
                            alternarSubtarefas(tarefa.id)
                          }}
                          aria-expanded={aberto}
                          aria-label={aberto ? 'Ocultar subtarefas' : 'Ver subtarefas em detalhe'}
                          title={aberto ? 'Ocultar subtarefas' : 'Ver subtarefas em detalhe'}
                        >
                          <IconChevronRight size={18} className="task-collapse-chevron" />
                        </button>
                      )}
                      <div>
                        <h4>{tarefa.titulo}</h4>
                        <small>{tarefa.produto}</small>
                        {contagemSub && (
                          <div
                            className={`kanban-subtarefas-resumo ${subtarefasTodasOk ? 'kanban-subtarefas-resumo--ok' : ''}`}
                          >
                            <div className="kanban-subtarefas-resumo-top">
                              <span className="kanban-subtarefas-resumo-lead">
                                <IconLayers size={15} className="kanban-subtarefas-resumo-icon" aria-hidden />
                                <span className="kanban-subtarefas-resumo-label">Subtarefas</span>
                              </span>
                              <span className="kanban-subtarefas-resumo-count" aria-live="polite">
                                {contagemSub.concluidas}/{contagemSub.total}
                              </span>
                            </div>
                            <div
                              className="kanban-subtarefas-resumo-bar"
                              role="progressbar"
                              aria-valuenow={contagemSub.concluidas}
                              aria-valuemin={0}
                              aria-valuemax={contagemSub.total}
                              aria-label={`${contagemSub.concluidas} de ${contagemSub.total} subtarefas concluídas`}
                            >
                              <span
                                className="kanban-subtarefas-resumo-bar-fill"
                                style={{ width: `${pctSub}%` }}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {atribuicoes.length > 0 && (
                      <ul className="assignee-list">
                        {atribuicoes.map(({ id, nome }) => (
                          <li key={id}>{nome}</li>
                        ))}
                      </ul>
                    )}

                    <dl className="card-meta">
                      <div>
                        <dt>Data</dt>
                        <dd>{new Date(tarefa.data + 'T00:00:00').toLocaleDateString('pt-BR')}</dd>
                      </div>
                      <div>
                        <dt>Tempo (HH:MM)</dt>
                        <dd>{formatarTempoHoraMinuto(tarefa.tempoTrabalhadoHoras)}</dd>
                      </div>
                    </dl>
                    <CronometroTarefa tarefa={tarefa} className="kanban-cronometro" />

                    <div className="card-actions">
                      <button className="button ghost sm" onClick={() => onEditar(tarefa)}>
                        <IconEdit size={14} />
                        <span>Editar</span>
                      </button>
                      <button className="button danger sm" onClick={() => onExcluir(tarefa.id)}>
                        <IconTrash size={14} />
                        <span>Excluir</span>
                      </button>
                    </div>

                    {temSubtarefas && aberto && (
                      <div
                        className="kanban-subtarefas-panel"
                        onMouseDown={(e) => e.stopPropagation()}
                      >
                        <p className="subtarefas-expand-titulo">Subtarefas</p>
                        <SubtarefasDetalheList
                          subtarefas={subs}
                          usuariosPorId={usuariosPorId}
                          onEditar={onEditar}
                          onExcluir={onExcluir}
                          onAlterarStatus={onAlterarStatus}
                          layout="stack"
                        />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
