import type { Tarefa, Usuario } from '../types'
import { IconEdit, IconTrash } from './Icons'

type TaskTableProps = {
  tarefas: Tarefa[]
  onEditar: (tarefa: Tarefa) => void
  onExcluir: (id: string) => void
  onAlterarStatus: (id: string, status: Tarefa['status']) => void
  usuariosPorId: Record<string, Usuario>
}

const statusList = ['NOVO', 'EM ANDAMENTO', 'PAUSADO', 'CONCLUIDO'] as const

export function TaskTable({ tarefas, onEditar, onExcluir, onAlterarStatus, usuariosPorId }: TaskTableProps) {
  if (tarefas.length === 0) {
    return <p className="empty-state">Nenhuma tarefa encontrada com os filtros selecionados.</p>
  }

  return (
    <div className="table-wrapper">
      <table className="task-table">
        <thead>
          <tr>
            <th>Título</th>
            <th>Produto</th>
            <th>Status</th>
            <th>Tempo (h)</th>
            <th>Data</th>
            <th>Atribuído a</th>
            <th>Observações</th>
            <th>Atualizado em</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {tarefas.map((tarefa) => (
            <tr key={tarefa.id}>
              <td>{tarefa.titulo}</td>
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
              <td>{tarefa.tempoTrabalhadoHoras ?? '—'}</td>
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
              <td className="observacoes">{tarefa.observacoes || '—'}</td>
              <td>{new Date(tarefa.atualizadaEm).toLocaleString('pt-BR')}</td>
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
          ))}
        </tbody>
      </table>
    </div>
  )
}


