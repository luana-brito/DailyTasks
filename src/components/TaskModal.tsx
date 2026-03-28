import { TaskForm } from './TaskForm'
import { SubtarefasPanel } from './SubtarefasPanel'
import type { ComponentProps } from 'react'
import type { Status, Tarefa, Usuario, Produto } from '../types'

type TaskModalProps = {
  aberto: boolean
  tarefa: Tarefa | null
  dataPadrao: string
  usuarios: Usuario[]
  usuarioAtualId?: string
  produtos: Produto[]
  todasTarefas: Tarefa[]
  tarefaMaeParaFormulario?: Tarefa | null
  onClose: () => void
  onSubmit: ComponentProps<typeof TaskForm>['onSubmit']
  onCriarSubtarefa: (mae: Tarefa, titulo: string) => Promise<void>
  onEditarSubtarefa: (subtarefa: Tarefa) => void
  onExcluirSubtarefa: (id: string) => void
  onAlterarStatusSubtarefa: (id: string, status: Status) => void
}

export function TaskModal({
  aberto,
  tarefa,
  dataPadrao,
  usuarios,
  usuarioAtualId,
  produtos,
  todasTarefas,
  tarefaMaeParaFormulario,
  onClose,
  onSubmit,
  onCriarSubtarefa,
  onEditarSubtarefa,
  onExcluirSubtarefa,
  onAlterarStatusSubtarefa
}: TaskModalProps) {
  if (!aberto) return null

  const tituloModal = !tarefa ? 'Nova tarefa' : tarefa.parentId ? 'Editar subtarefa' : 'Editar tarefa'

  const subtarefasDaMae =
    tarefa && !tarefa.parentId
      ? todasTarefas.filter((item) => item.parentId === tarefa.id)
      : []

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal task-modal task-modal-with-subtasks">
        <header className="modal-header">
          <h2>{tituloModal}</h2>
          <button className="button ghost" onClick={onClose} type="button">
            Fechar
          </button>
        </header>

        <TaskForm
          onSubmit={onSubmit}
          tarefaEditando={tarefa}
          tarefaMae={tarefaMaeParaFormulario ?? null}
          onCancelEdit={onClose}
          dataPadrao={dataPadrao}
          usuarios={usuarios}
          usuarioAtualId={usuarioAtualId}
          produtos={produtos}
        />

        {tarefa && !tarefa.parentId && (
          <SubtarefasPanel
            subtarefas={subtarefasDaMae}
            onCriar={(titulo) => onCriarSubtarefa(tarefa, titulo)}
            onEditar={onEditarSubtarefa}
            onExcluir={onExcluirSubtarefa}
            onAlterarStatus={onAlterarStatusSubtarefa}
          />
        )}
      </div>
    </div>
  )
}

