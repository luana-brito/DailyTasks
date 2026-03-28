import type { Status, Tarefa, Usuario } from '../types'
import { formatarTempoHoraMinuto } from '../utils/tempoTrabalhado'
import { IconEdit, IconTrash } from './Icons'

const statusList = ['NOVO', 'EM ANDAMENTO', 'PAUSADO', 'CONCLUIDO'] as const

type SubtarefasDetalheListProps = {
  subtarefas: Tarefa[]
  usuariosPorId: Record<string, Usuario>
  onEditar: (tarefa: Tarefa) => void
  onExcluir: (id: string) => void
  onAlterarStatus: (id: string, status: Status) => void
  /** Tabela interna (modo tabela) ou cartões (Kanban / calendário) */
  layout: 'table' | 'stack'
}

function linhaAtribuidos(tarefa: Tarefa, usuariosPorId: Record<string, Usuario>) {
  const atribuicoes = tarefa.atribuidoIds
    .map((id) => {
      const usuario = usuariosPorId[id]
      return usuario ? { id: usuario.id, nome: usuario.nome } : null
    })
    .filter((item): item is { id: string; nome: string } => Boolean(item))

  if (atribuicoes.length === 0) return '—'
  return atribuicoes.map((a) => a.nome).join(', ')
}

export function SubtarefasDetalheList({
  subtarefas,
  usuariosPorId,
  onEditar,
  onExcluir,
  onAlterarStatus,
  layout
}: SubtarefasDetalheListProps) {
  if (subtarefas.length === 0) return null

  if (layout === 'table') {
    return (
      <table className="subtarefas-detalhe-table">
        <thead>
          <tr>
            <th>Subtarefa</th>
            <th>Prioridade</th>
            <th>Status</th>
            <th>Tempo (HH:MM)</th>
            <th>Responsáveis</th>
            <th>Atualizado</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {subtarefas.map((st) => (
            <tr key={st.id}>
              <td className="subtarefa-detalhe-titulo">{st.titulo}</td>
              <td>{st.prioridade}</td>
              <td>
                <select
                  className="subtarefas-detalhe-select"
                  value={st.status}
                  onChange={(e) => onAlterarStatus(st.id, e.target.value as Status)}
                  disabled={st.status === 'CONCLUIDO'}
                  aria-label={`Status: ${st.titulo}`}
                >
                  {statusList.map((status) => (
                    <option
                      key={status}
                      value={status}
                      disabled={st.status !== 'NOVO' && status === 'NOVO'}
                    >
                      {status}
                    </option>
                  ))}
                </select>
              </td>
              <td>{formatarTempoHoraMinuto(st.tempoTrabalhadoHoras)}</td>
              <td className="subtarefa-detalhe-atrib">{linhaAtribuidos(st, usuariosPorId)}</td>
              <td>{new Date(st.atualizadaEm).toLocaleString('pt-BR')}</td>
              <td className="actions-cell">
                <div className="actions-wrap">
                  <button
                    type="button"
                    className="button ghost icon-button"
                    title="Editar subtarefa"
                    aria-label="Editar subtarefa"
                    onClick={() => onEditar(st)}
                  >
                    <IconEdit size={16} />
                  </button>
                  <button
                    type="button"
                    className="button danger icon-button"
                    title="Excluir subtarefa"
                    aria-label="Excluir subtarefa"
                    onClick={() => onExcluir(st.id)}
                  >
                    <IconTrash size={16} />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    )
  }

  return (
    <ul className="subtarefas-detalhe-stack">
      {subtarefas.map((st) => (
        <li key={st.id} className="subtarefa-detalhe-card">
          <div className="subtarefa-detalhe-card-top">
            <strong className="subtarefa-detalhe-card-titulo">{st.titulo}</strong>
            <span className="subtarefa-detalhe-prioridade">{st.prioridade}</span>
          </div>

          <div className="subtarefa-detalhe-card-section">
            <label className="subtarefa-detalhe-label" htmlFor={`sub-status-${st.id}`}>
              Status
            </label>
            <select
              id={`sub-status-${st.id}`}
              className="subtarefas-detalhe-select"
              value={st.status}
              onChange={(e) => onAlterarStatus(st.id, e.target.value as Status)}
              disabled={st.status === 'CONCLUIDO'}
              aria-label={`Status: ${st.titulo}`}
            >
              {statusList.map((status) => (
                <option
                  key={status}
                  value={status}
                  disabled={st.status !== 'NOVO' && status === 'NOVO'}
                >
                  {status}
                </option>
              ))}
            </select>
          </div>

          <div className="subtarefa-detalhe-bloco-info">
            <dl className="subtarefa-detalhe-dl">
              <div>
                <dt>Tempo (HH:MM)</dt>
                <dd>{formatarTempoHoraMinuto(st.tempoTrabalhadoHoras)}</dd>
              </div>
              <div>
                <dt>Atualizado</dt>
                <dd>{new Date(st.atualizadaEm).toLocaleString('pt-BR')}</dd>
              </div>
            </dl>
            <p className="subtarefa-detalhe-atribuicao">
              <span className="subtarefa-detalhe-atrib-label">Responsáveis</span>
              <span className="subtarefa-detalhe-atrib-valor">{linhaAtribuidos(st, usuariosPorId)}</span>
            </p>
          </div>

          <div className="subtarefa-detalhe-acoes">
            <button type="button" className="button ghost sm" onClick={() => onEditar(st)}>
              <IconEdit size={14} />
              <span>Editar</span>
            </button>
            <button type="button" className="button danger sm" onClick={() => onExcluir(st.id)}>
              <IconTrash size={14} />
              <span>Excluir</span>
            </button>
          </div>
        </li>
      ))}
    </ul>
  )
}
