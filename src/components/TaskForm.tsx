import { useEffect, useMemo, useState } from 'react'
import type { Produto, Status, Tarefa, Usuario } from '../types'

type TaskFormValues = {
  titulo: string
  produto: Produto
  status: Status
  tempoTrabalhadoHoras?: number
  data: string
  observacoes?: string
  atribuidoIds: string[]
}

type TaskFormProps = {
  onSubmit: (valores: TaskFormValues, tarefaEditando?: Tarefa) => void
  tarefaEditando?: Tarefa | null
  onCancelEdit?: () => void
  dataPadrao?: string
  usuarios: Usuario[]
  usuarioAtualId?: string
}

const produtos: Produto[] = ['SISGRADE', 'SIVOPE', 'CIEVS', 'GESTÃO']
const statusList: Status[] = ['NOVO', 'EM ANDAMENTO', 'PAUSADO', 'CONCLUIDO']

const criarEstadoInicial = (dataPadrao?: string, usuarioAtualId?: string): TaskFormValues => ({
  titulo: '',
  produto: '' as Produto,
  status: 'NOVO',
  tempoTrabalhadoHoras: undefined,
  data: dataPadrao ?? new Date().toISOString().slice(0, 10),
  observacoes: '',
  atribuidoIds: usuarioAtualId ? [usuarioAtualId] : []
})

export function TaskForm({
  onSubmit,
  tarefaEditando,
  onCancelEdit,
  dataPadrao,
  usuarios,
  usuarioAtualId
}: TaskFormProps) {
  const [values, setValues] = useState<TaskFormValues>(() =>
    criarEstadoInicial(dataPadrao, usuarioAtualId)
  )

  const usuariosOrdenados = useMemo(
    () => [...usuarios].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')),
    [usuarios]
  )

  useEffect(() => {
    if (tarefaEditando) {
      const { titulo, produto, status, tempoTrabalhadoHoras, observacoes, data, atribuidoIds } =
        tarefaEditando
      setValues({
        titulo,
        produto,
        status,
        tempoTrabalhadoHoras,
        data,
        observacoes: observacoes ?? '',
        atribuidoIds: atribuidoIds.length > 0 ? atribuidoIds : usuarioAtualId ? [usuarioAtualId] : []
      })
    } else {
      setValues(criarEstadoInicial(dataPadrao, usuarioAtualId))
    }
  }, [tarefaEditando, dataPadrao, usuarioAtualId])

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const tempo = values.tempoTrabalhadoHoras

    if (!values.titulo.trim()) {
      alert('Informe um título para a tarefa.')
      return
    }

    if (values.status === 'CONCLUIDO' && (tempo === undefined || tempo === null || Number.isNaN(tempo))) {
      alert('Informe o tempo trabalhado em horas para concluir a tarefa.')
      return
    }

    if (!values.atribuidoIds || values.atribuidoIds.length === 0) {
      alert('Selecione pelo menos um responsável pela tarefa.')
      return
    }

    onSubmit(values, tarefaEditando ?? undefined)
    if (!tarefaEditando) {
      setValues(criarEstadoInicial(dataPadrao, usuarioAtualId))
    }
  }

  const handleChange = (field: keyof TaskFormValues, value: string) => {
    if (field === 'tempoTrabalhadoHoras') {
      setValues((prev) => ({
        ...prev,
        tempoTrabalhadoHoras: value === '' ? undefined : Number(value)
      }))
      return
    }

    setValues((prev) => ({
      ...prev,
      [field]: value as TaskFormValues[Exclude<keyof TaskFormValues, 'tempoTrabalhadoHoras'>]
    }))
  }

  const handleAtribuidosChange = (valuesSelecionados: string[]) => {
    setValues((prev) => ({
      ...prev,
      atribuidoIds: valuesSelecionados
    }))
  }

  const statusSelectDisabled = tarefaEditando?.status === 'CONCLUIDO'
  const statusOptionDisabled = (status: Status) => {
    if (!tarefaEditando) return false
    if (tarefaEditando.status === 'CONCLUIDO') {
      return status !== 'CONCLUIDO'
    }
    if (tarefaEditando.status !== 'NOVO' && status === 'NOVO') {
      return true
    }
    return false
  }

  return (
    <form className="task-form" onSubmit={handleSubmit}>
      <div className="field">
        <label htmlFor="titulo">
          Título <span className="required-marker">*</span>
        </label>
        <input
          id="titulo"
          value={values.titulo}
          onChange={(event) => handleChange('titulo', event.target.value)}
          required
          placeholder="Descreva a tarefa"
        />
      </div>

      <div className="field-group">
        <div className="field">
          <label htmlFor="produto">
            Produto <span className="required-marker">*</span>
          </label>
          <select
            id="produto"
            value={values.produto}
            onChange={(event) => handleChange('produto', event.target.value)}
            required
          >
            <option value="" disabled>
              Selecione um produto
            </option>
            {produtos.map((produto) => (
              <option key={produto} value={produto}>
                {produto}
              </option>
            ))}
          </select>
        </div>

        <div className="field">
          <label htmlFor="status">
            Status <span className="required-marker">*</span>
          </label>
          <select
            id="status"
            value={values.status}
            onChange={(event) => handleChange('status', event.target.value)}
            disabled={statusSelectDisabled}
          >
            {statusList.map((status) => (
              <option key={status} value={status} disabled={statusOptionDisabled(status)}>
                {status}
              </option>
            ))}
          </select>
        </div>

        <div className="field">
          <label htmlFor="tempo">Tempo trabalhado (h)</label>
          <input
            id="tempo"
            type="number"
            min={0}
            step={0.25}
            value={values.tempoTrabalhadoHoras ?? ''}
            onChange={(event) => handleChange('tempoTrabalhadoHoras', event.target.value)}
            placeholder="Opcional"
          />
        </div>

        <div className="field">
          <label htmlFor="data">
            Data <span className="required-marker">*</span>
          </label>
          <input
            id="data"
            type="date"
            value={values.data}
            onChange={(event) => handleChange('data', event.target.value)}
            required
          />
        </div>
      </div>

      <div className="field">
        <label htmlFor="atribuidos">
          Atribuído a <span className="required-marker">*</span>
        </label>
        <select
          id="atribuidos"
          multiple
          value={values.atribuidoIds}
          onChange={(event) => {
            const selecionados = Array.from(event.target.selectedOptions).map((option) => option.value)
            handleAtribuidosChange(selecionados)
          }}
          size={Math.min(usuariosOrdenados.length, 6) || 3}
        >
          {usuariosOrdenados.map((usuario) => (
            <option key={usuario.id} value={usuario.id}>
              {usuario.nome}
            </option>
          ))}
        </select>
        <small className="helper-text">
          Selecione um ou mais responsáveis. Pressione Ctrl/Cmd para selecionar múltiplos.
        </small>
      </div>

      <div className="field">
        <label htmlFor="observacoes">Observações</label>
        <textarea
          id="observacoes"
          rows={3}
          value={values.observacoes ?? ''}
          onChange={(event) => handleChange('observacoes', event.target.value)}
          placeholder="Informações adicionais"
        />
      </div>

      <div className="actions">
        {tarefaEditando ? (
          <>
            <button type="button" className="button ghost" onClick={onCancelEdit}>
              Cancelar
            </button>
            <button type="submit" className="button primary">
              Salvar alterações
            </button>
          </>
        ) : (
          <button type="submit" className="button primary">
            Adicionar tarefa
          </button>
        )}
      </div>
    </form>
  )
}

