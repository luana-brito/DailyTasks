import { Fragment, useCallback, useMemo, useState } from 'react'
import type { Tarefa, Usuario } from '../types'
import { useMediaQuery } from '../hooks/useMediaQuery'
import { IconEdit, IconTrash, IconChevronRight } from './Icons'
import { SubtarefasDetalheList } from './SubtarefasDetalheList'
import { CronometroTarefa } from './CronometroTarefa'
import { formatarTempoHoraMinuto } from '../utils/tempoTrabalhado'

type TaskTableProps = {
  tarefas: Tarefa[]
  contagemSubtarefasPorTarefaId?: Record<string, { total: number; concluidas: number }>
  subtarefasPorParentId?: Record<string, Tarefa[]>
  onEditar: (tarefa: Tarefa) => void
  onExcluir: (id: string) => void
  onAlterarStatus: (id: string, status: Tarefa['status']) => void
  usuariosPorId: Record<string, Usuario>
}

const statusList = ['NOVO', 'EM ANDAMENTO', 'PAUSADO', 'CONCLUIDO'] as const

const PRIORIDADE_ORDEM: Record<string, number> = { ALTA: 0, MEDIA: 1, BAIXA: 2 }

function classePrioridadeTabela(prioridade: Tarefa['prioridade']): string {
  if (prioridade === 'ALTA') return 'task-table-prioridade task-table-prioridade--alta'
  if (prioridade === 'MEDIA') return 'task-table-prioridade task-table-prioridade--media'
  return 'task-table-prioridade task-table-prioridade--baixa'
}

export function TaskTable({
  tarefas,
  contagemSubtarefasPorTarefaId,
  subtarefasPorParentId,
  onEditar,
  onExcluir,
  onAlterarStatus,
  usuariosPorId
}: TaskTableProps) {
  const [expandidas, setExpandidas] = useState<Set<string>>(() => new Set())
  const subtarefasLayoutColapso = useMediaQuery('(max-width: 768px)') ? 'stack' : 'table'

  const alternarSubtarefas = useCallback((id: string) => {
    setExpandidas((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const tarefasOrdenadas = useMemo(() => {
    return [...tarefas].sort((a, b) => {
      const pa = PRIORIDADE_ORDEM[a.prioridade] ?? 1
      const pb = PRIORIDADE_ORDEM[b.prioridade] ?? 1
      if (pa !== pb) return pa - pb
      return new Date(b.atualizadaEm).getTime() - new Date(a.atualizadaEm).getTime()
    })
  }, [tarefas])

  if (tarefas.length === 0) {
    return <p className="empty-state">Nenhuma tarefa encontrada com os filtros selecionados.</p>
  }

  return (
    <div className="table-wrapper">
      <table className="task-table">
        <thead>
          <tr>
            <th>Título / subtarefas</th>
            <th>Produto</th>
            <th>Status</th>
            <th>Tempo (HH:MM)</th>
            <th>Data</th>
            <th>Atribuído a</th>
            <th>Prioridade</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {tarefasOrdenadas.map((tarefa) => {
            const subs = subtarefasPorParentId?.[tarefa.id] ?? []
            const temSubtarefas = subs.length > 0
            const aberto = expandidas.has(tarefa.id)

            return (
              <Fragment key={tarefa.id}>
                <tr className={temSubtarefas ? 'task-row-com-subtarefas' : undefined}>
                  <td>
                    <div className="task-title-cell-wrap">
                      {temSubtarefas && (
                        <button
                          type="button"
                          className={`task-collapse-toggle ${aberto ? 'aberto' : ''}`}
                          onClick={() => alternarSubtarefas(tarefa.id)}
                          aria-expanded={aberto}
                          aria-label={aberto ? 'Ocultar subtarefas' : 'Ver subtarefas em detalhe'}
                          title={aberto ? 'Ocultar subtarefas' : 'Ver subtarefas em detalhe'}
                        >
                          <IconChevronRight size={18} className="task-collapse-chevron" />
                        </button>
                      )}
                      <div className="task-title-block">
                        <div className="task-title-cell">{tarefa.titulo}</div>
                        {contagemSubtarefasPorTarefaId?.[tarefa.id] && (
                          <small className="subtarefas-resumo">
                            Subtarefas: {contagemSubtarefasPorTarefaId[tarefa.id].concluidas}/
                            {contagemSubtarefasPorTarefaId[tarefa.id].total} concluídas
                          </small>
                        )}
                      </div>
                    </div>
                  </td>
                  <td>{tarefa.produto}</td>
                  <td>
                    <select
                      value={tarefa.status}
                      onChange={(event) => onAlterarStatus(tarefa.id, event.target.value as Tarefa['status'])}
                      disabled={tarefa.status === 'CONCLUIDO'}
                    >
                      {statusList.map((status) => (
                        <option
                          key={status}
                          value={status}
                          disabled={tarefa.status !== 'NOVO' && status === 'NOVO'}
                        >
                          {status}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <div className="task-table-tempo-cell">
                      <span>{formatarTempoHoraMinuto(tarefa.tempoTrabalhadoHoras)}</span>
                      <CronometroTarefa tarefa={tarefa} />
                    </div>
                  </td>
                  <td>{new Date(tarefa.data + 'T00:00:00').toLocaleDateString('pt-BR')}</td>
                  <td>
                    {(() => {
                      const atribuicoes = tarefa.atribuidoIds
                        .map((id) => {
                          const usuario = usuariosPorId[id]
                          return usuario ? { id: usuario.id, nome: usuario.nome } : null
                        })
                        .filter((item): item is { id: string; nome: string } => Boolean(item))

                      if (atribuicoes.length === 0) {
                        return '—'
                      }

                      return (
                        <ul className="assignee-list inline">
                          {atribuicoes.map(({ id, nome }) => (
                            <li key={id}>{nome}</li>
                          ))}
                        </ul>
                      )
                    })()}
                  </td>
                  <td>
                    <span className={classePrioridadeTabela(tarefa.prioridade)}>{tarefa.prioridade}</span>
                  </td>
                  <td className="actions-cell">
                    <div className="actions-wrap">
                      <button
                        className="button ghost icon-button"
                        onClick={() => onEditar(tarefa)}
                        aria-label="Editar tarefa"
                        title="Editar tarefa"
                      >
                        <IconEdit size={16} />
                      </button>
                      <button
                        className="button danger icon-button"
                        onClick={() => onExcluir(tarefa.id)}
                        aria-label="Excluir tarefa"
                        title="Excluir tarefa"
                      >
                        <IconTrash size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
                {temSubtarefas && aberto && (
                  <tr className="subtarefas-expand-row">
                    <td colSpan={8}>
                      <div className="subtarefas-expand-panel">
                        <p className="subtarefas-expand-titulo">Subtarefas</p>
                        <SubtarefasDetalheList
                          subtarefas={subs}
                          usuariosPorId={usuariosPorId}
                          onEditar={onEditar}
                          onExcluir={onExcluir}
                          onAlterarStatus={onAlterarStatus}
                          layout={subtarefasLayoutColapso}
                        />
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
