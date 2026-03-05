import { TaskForm } from './TaskForm'
import type { Tarefa, Usuario } from '../types'

type TaskModalProps = {
  aberto: boolean
  tarefa: Tarefa | null
  dataPadrao: string
  usuarios: Usuario[]
  usuarioAtualId?: string
  onClose: () => void
  onSubmit: React.ComponentProps<typeof TaskForm>['onSubmit']
}

export function TaskModal({
  aberto,
  tarefa,
  dataPadrao,
  usuarios,
  usuarioAtualId,
  onClose,
  onSubmit
}: TaskModalProps) {
  if (!aberto) return null

  const titulo = tarefa ? 'Editar tarefa' : 'Nova tarefa'

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal task-modal">
        <header className="modal-header">
          <h2>{titulo}</h2>
          <button className="button ghost" onClick={onClose} type="button">
            Fechar
          </button>
        </header>

        <TaskForm
          onSubmit={onSubmit}
          tarefaEditando={tarefa}
          onCancelEdit={onClose}
          dataPadrao={dataPadrao}
          usuarios={usuarios}
          usuarioAtualId={usuarioAtualId}
        />
      </div>
    </div>
  )
}

