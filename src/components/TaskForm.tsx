import { useEffect, useMemo, useState, type FormEvent } from 'react'
import {
  type Prioridade,
  type Produto,
  type Status,
  type Tarefa,
  type Usuario,
  LIMITE_CARACTERES_TITULO_TAREFA,
  truncarTituloTarefa
} from '../types'
import { horasDecimaisParaStringHm, parseStringHmParaHorasDecimais } from '../utils/tempoTrabalhado'
import { ObservacoesRichEditor } from './ObservacoesRichEditor'

export type TaskFormValues = {
  titulo: string
  produto: string
  status: Status
  prioridade: Prioridade
  tempoTrabalhadoHoras?: number
  data: string
  observacoes?: string
  atribuidoIds: string[]
}

type TaskFormProps = {
  onSubmit: (valores: TaskFormValues, tarefaEditando?: Tarefa, continuar?: boolean) => void
  tarefaEditando?: Tarefa | null
  /** Tarefa mãe, quando estiver editando uma subtarefa */
  tarefaMae?: Tarefa | null
  onCancelEdit?: () => void
  dataPadrao?: string
  usuarios: Usuario[]
  usuarioAtualId?: string
  produtos: Produto[]
}

const statusList: Status[] = ['NOVO', 'EM ANDAMENTO', 'PAUSADO', 'CONCLUIDO']
const prioridadeList: Prioridade[] = ['ALTA', 'MEDIA', 'BAIXA']

const criarEstadoInicial = (dataPadrao?: string, usuarioAtualId?: string): TaskFormValues => ({
  titulo: '',
  produto: '',
  status: 'NOVO',
  prioridade: 'MEDIA',
  tempoTrabalhadoHoras: undefined,
  data: dataPadrao ?? new Date().toISOString().slice(0, 10),
  observacoes: '',
  atribuidoIds: usuarioAtualId ? [usuarioAtualId] : []
})

export function TaskForm({
  onSubmit,
  tarefaEditando,
  tarefaMae,
  onCancelEdit,
  dataPadrao,
  usuarios,
  usuarioAtualId,
  produtos
}: TaskFormProps) {
  const [values, setValues] = useState<TaskFormValues>(() =>
    criarEstadoInicial(dataPadrao, usuarioAtualId)
  )
  const [tempoHmStr, setTempoHmStr] = useState('')

  const usuariosOrdenados = useMemo(
    () => [...usuarios].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')),
    [usuarios]
  )

  useEffect(() => {
    if (tarefaEditando) {
      const {
        titulo,
        produto,
        status,
        prioridade,
        tempoTrabalhadoHoras,
        observacoes,
        data,
        atribuidoIds
      } = tarefaEditando
      setTempoHmStr(horasDecimaisParaStringHm(tempoTrabalhadoHoras))
      setValues({
        titulo: truncarTituloTarefa(titulo),
        produto,
        status,
        prioridade: prioridade ?? 'MEDIA',
        tempoTrabalhadoHoras,
        data,
        observacoes: observacoes ?? '',
        atribuidoIds: atribuidoIds.length > 0 ? atribuidoIds : usuarioAtualId ? [usuarioAtualId] : []
      })
    } else {
      setTempoHmStr('')
      setValues(criarEstadoInicial(dataPadrao, usuarioAtualId))
    }
  }, [tarefaEditando, dataPadrao, usuarioAtualId])

  const isPessoal = values.produto === 'PESSOAL'

  useEffect(() => {
    if (isPessoal && usuarioAtualId) {
      setValues((prev) => ({
        ...prev,
        atribuidoIds: [usuarioAtualId]
      }))
    }
  }, [isPessoal, usuarioAtualId])

  const [continuar, setContinuar] = useState(false)

  const validarFormulario = (): boolean => {
    const bruto = tempoHmStr.trim()
    const tempo = parseStringHmParaHorasDecimais(tempoHmStr)

    if (!values.titulo.trim()) {
      alert('Informe um título para a tarefa.')
      return false
    }

    if (values.status === 'CONCLUIDO') {
      if (bruto === '') {
        alert('Informe o tempo trabalhado (HH:MM) para concluir a tarefa.')
        return false
      }
      if (tempo === undefined) {
        alert('Tempo inválido. Use o formato HH:MM (ex.: 01:30 ou 00:45).')
        return false
      }
    } else if (bruto !== '' && tempo === undefined) {
      alert('Tempo inválido. Use o formato HH:MM (ex.: 01:30).')
      return false
    }

    if (!values.atribuidoIds || values.atribuidoIds.length === 0) {
      alert('Selecione pelo menos um responsável pela tarefa.')
      return false
    }

    return true
  }

  const valoresComTempo = (): TaskFormValues => ({
    ...values,
    tempoTrabalhadoHoras: parseStringHmParaHorasDecimais(tempoHmStr)
  })

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!validarFormulario()) return

    onSubmit(valoresComTempo(), tarefaEditando ?? undefined, continuar)
    if (!tarefaEditando) {
      setValues(criarEstadoInicial(dataPadrao, usuarioAtualId))
      setTempoHmStr('')
    }
    setContinuar(false)
  }

  const handleCriarEContinuar = () => {
    if (!validarFormulario()) return
    setContinuar(true)
    onSubmit(valoresComTempo(), undefined, true)
    setValues(criarEstadoInicial(dataPadrao, usuarioAtualId))
    setTempoHmStr('')
  }

  const handleChange = (field: keyof TaskFormValues, value: string) => {
    setValues((prev) => ({
      ...prev,
      [field]: value as TaskFormValues[keyof TaskFormValues]
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
      {tarefaMae && (
        <p className="helper-text subtarefa-contexto">
          Subtarefa de: <strong>{tarefaMae.titulo}</strong>
        </p>
      )}

      <div className="field">
        <label htmlFor="titulo">
          Título <span className="required-marker">*</span>
        </label>
        <input
          id="titulo"
          value={values.titulo}
          onChange={(event) =>
            handleChange(
              'titulo',
              event.target.value.slice(0, LIMITE_CARACTERES_TITULO_TAREFA)
            )
          }
          maxLength={LIMITE_CARACTERES_TITULO_TAREFA}
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
              <option key={produto.id} value={produto.nome}>
                {produto.nome}
              </option>
            ))}
          </select>
        </div>

        <div className="field">
          <label htmlFor="prioridade">
            Prioridade <span className="required-marker">*</span>
          </label>
          <select
            id="prioridade"
            value={values.prioridade}
            onChange={(event) => handleChange('prioridade', event.target.value)}
          >
            {prioridadeList.map((prioridade) => (
              <option key={prioridade} value={prioridade}>
                {prioridade}
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
          <label htmlFor="tempo-hhmm">Tempo trabalhado (HH:MM)</label>
          <input
            id="tempo-hhmm"
            className="input-tempo-hhmm"
            type="text"
            inputMode="numeric"
            autoComplete="off"
            spellCheck={false}
            placeholder="00:30"
            value={tempoHmStr}
            onChange={(event) => setTempoHmStr(event.target.value)}
            onBlur={() => {
              const p = parseStringHmParaHorasDecimais(tempoHmStr)
              if (p != null) setTempoHmStr(horasDecimaisParaStringHm(p))
            }}
            aria-describedby="tempo-hhmm-hint"
          />
          <small className="helper-text" id="tempo-hhmm-hint">
            Duração em horas e minutos (ex.: 01:30). Opcional exceto ao marcar Concluído.
          </small>
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
        {isPessoal ? (
          <>
            <input
              type="text"
              value={usuariosOrdenados.find(u => u.id === usuarioAtualId)?.nome ?? 'Você'}
              disabled
            />
            <small className="helper-text">
              Tarefas pessoais são visíveis apenas para você.
            </small>
          </>
        ) : (
          <>
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
          </>
        )}
      </div>

      <div className="field">
        <span className="field-label-block" id="observacoes-label">
          Observações
        </span>
        <ObservacoesRichEditor
          ariaLabelledBy="observacoes-label"
          value={values.observacoes ?? ''}
          onChange={(html) => handleChange('observacoes', html)}
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
          <>
            <button type="button" className="button ghost" onClick={handleCriarEContinuar}>
              Criar e continuar
            </button>
            <button type="submit" className="button primary">
              Adicionar tarefa
            </button>
          </>
        )}
      </div>
    </form>
  )
}

