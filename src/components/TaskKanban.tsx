import { useMemo, useState } from 'react'
import type { DragEvent } from 'react'
import type { Status, Tarefa, Usuario } from '../types'
import { IconEdit, IconTrash } from './Icons'

type TaskKanbanProps = {
  tarefas: Tarefa[]
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
  onEditar,
  onExcluir,
  onAlterarStatus,
  usuariosPorId
}: TaskKanbanProps) {
  const [dragInfo, setDragInfo] = useState<DragInfo | null>(null)

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

                return (
                  <div
                    key={tarefa.id}
                    className={`kanban-card ${tarefa.status === 'CONCLUIDO' ? 'concluido' : ''}`}
                    draggable={tarefa.status !== 'CONCLUIDO'}
                    onDragStart={(evento) => handleDragStart(evento, tarefa.id)}
                    onDragEnd={() => setDragInfo(null)}
                  >
                    <div>
                      <h4>{tarefa.titulo}</h4>
                      <small>{tarefa.produto}</small>
                    </div>

                    {atribuicoes.length > 0 && (
                      <ul className="assignee-list">
                        {atribuicoes.map(({ id, nome }) => (
                          <li key={id}>{nome}</li>
                        ))}
                      </ul>
                    )}

                    {tarefa.observacoes && <p className="observacoes">{tarefa.observacoes}</p>}

                    <dl className="card-meta">
                      <div>
                        <dt>Data</dt>
                        <dd>{new Date(tarefa.data + 'T00:00:00').toLocaleDateString('pt-BR')}</dd>
                      </div>
                      <div>
                        <dt>Tempo (h)</dt>
                        <dd>{tarefa.tempoTrabalhadoHoras ?? '—'}</dd>
                      </div>
                    </dl>

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

