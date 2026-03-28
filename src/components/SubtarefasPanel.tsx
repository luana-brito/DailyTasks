import { useMemo, useState } from 'react'
import { type Status, type Tarefa, LIMITE_CARACTERES_TITULO_TAREFA } from '../types'
import { IconEdit, IconTrash } from './Icons'

type SubtarefasPanelProps = {
  subtarefas: Tarefa[]
  onCriar: (titulo: string) => Promise<void>
  onEditar: (subtarefa: Tarefa) => void
  onExcluir: (id: string) => void
  onAlterarStatus: (id: string, status: Status) => void
}

const statusList = ['NOVO', 'EM ANDAMENTO', 'PAUSADO', 'CONCLUIDO'] as const

export function SubtarefasPanel({
  subtarefas,
  onCriar,
  onEditar,
  onExcluir,
  onAlterarStatus
}: SubtarefasPanelProps) {
  const [tituloNova, setTituloNova] = useState('')
  const [criando, setCriando] = useState(false)

  const ordenadas = useMemo(
    () =>
      [...subtarefas].sort(
        (a, b) => new Date(a.criadaEm).getTime() - new Date(b.criadaEm).getTime()
      ),
    [subtarefas]
  )

  const handleAdicionar = async () => {
    const t = tituloNova.trim()
    if (!t) {
      alert('Informe um título para a subtarefa.')
      return
    }
    setCriando(true)
    try {
      await onCriar(t)
      setTituloNova('')
    } catch (e) {
      console.error(e)
      alert(e instanceof Error ? e.message : 'Não foi possível criar a subtarefa.')
    } finally {
      setCriando(false)
    }
  }

  return (
    <div className="subtarefas-panel">
      <h3 className="subtarefas-panel-title">Subtarefas</h3>
      <p className="subtarefas-panel-hint">
        Cada subtarefa fica vinculada a esta tarefa. Quando todas forem concluídas, a tarefa mãe é
        marcada como concluída automaticamente.
      </p>

      <div className="subtarefas-nova">
        <input
          type="text"
          value={tituloNova}
          onChange={(e) =>
            setTituloNova(e.target.value.slice(0, LIMITE_CARACTERES_TITULO_TAREFA))
          }
          maxLength={LIMITE_CARACTERES_TITULO_TAREFA}
          placeholder="Título da nova subtarefa"
          disabled={criando}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              void handleAdicionar()
            }
          }}
        />
        <button
          type="button"
          className="button secondary sm"
          disabled={criando}
          onClick={() => void handleAdicionar()}
        >
          Adicionar
        </button>
      </div>

      {ordenadas.length === 0 ? (
        <p className="subtarefas-vazio">Nenhuma subtarefa ainda.</p>
      ) : (
        <ul className="subtarefas-lista">
          {ordenadas.map((st) => (
            <li key={st.id} className="subtarefas-item">
              <span className="subtarefas-item-titulo">{st.titulo}</span>
              <select
                className="subtarefas-status"
                value={st.status}
                onChange={(e) => onAlterarStatus(st.id, e.target.value as Status)}
                disabled={st.status === 'CONCLUIDO'}
                aria-label={`Status da subtarefa ${st.titulo}`}
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
              <div className="subtarefas-item-acoes">
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
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
