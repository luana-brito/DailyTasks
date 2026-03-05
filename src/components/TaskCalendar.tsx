import { useMemo } from 'react'
import type { Status, Tarefa, Usuario } from '../types'
import { IconEdit, IconTrash, IconChevronLeft, IconChevronRight } from './Icons'

type TaskCalendarProps = {
  tarefasDoMes: Tarefa[]
  tarefasDoDia: Tarefa[]
  dataSelecionada: string
  onChangeData: (data: string) => void
  onEditar: (tarefa: Tarefa) => void
  onExcluir: (id: string) => void
  onAlterarStatus: (id: string, status: Status) => void
  usuariosPorId: Record<string, Usuario>
}

type DiaCalendario = {
  dataISO: string
  dia: number
  foraDoMes: boolean
  tarefas: Tarefa[]
}

const DIAS_SEMANA = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']

export function TaskCalendar({
  tarefasDoMes,
  tarefasDoDia,
  dataSelecionada,
  onChangeData,
  onEditar,
  onExcluir,
  onAlterarStatus,
  usuariosPorId
}: TaskCalendarProps) {
  const referencia = useMemo(() => new Date(dataSelecionada + 'T00:00:00'), [dataSelecionada])
  const mesReferencia = referencia.getMonth()
  const anoReferencia = referencia.getFullYear()

  const dias = useMemo<DiaCalendario[]>(() => {
    const primeiroDiaMes = new Date(anoReferencia, mesReferencia, 1)
    const deslocamentoInicio = (primeiroDiaMes.getDay() + 6) % 7 // segunda-feira como primeiro dia
    const inicioGrade = new Date(primeiroDiaMes)
    inicioGrade.setDate(primeiroDiaMes.getDate() - deslocamentoInicio)

    const diasGrade: DiaCalendario[] = []

    for (let i = 0; i < 42; i++) {
      const dataAtual = new Date(inicioGrade)
      dataAtual.setDate(inicioGrade.getDate() + i)
      const dataISO = dataAtual.toISOString().slice(0, 10)
      const foraDoMes = dataAtual.getMonth() !== mesReferencia
      const tarefasDia = tarefasDoMes.filter((tarefa) => tarefa.data === dataISO)

      diasGrade.push({
        dataISO,
        dia: dataAtual.getDate(),
        foraDoMes,
        tarefas: tarefasDia
      })
    }

    return diasGrade
  }, [anoReferencia, mesReferencia, tarefasDoMes])

  const rotuloMes = useMemo(() => {
    return referencia.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
  }, [referencia])

  const navegarMes = (incremento: number) => {
    const novaData = new Date(anoReferencia, mesReferencia + incremento, 1)
    onChangeData(novaData.toISOString().slice(0, 10))
  }

  return (
    <div className="calendar-layout">
      <div className="calendar-board">
        <header className="calendar-header">
          <div className="calendar-nav">
            <button type="button" className="button ghost icon-button" onClick={() => navegarMes(-1)} title="Mês anterior">
              <IconChevronLeft size={18} />
            </button>
            <button type="button" className="button ghost icon-button" onClick={() => navegarMes(1)} title="Próximo mês">
              <IconChevronRight size={18} />
            </button>
          </div>

          <h3>{rotuloMes}</h3>
        </header>

        <div className="calendar-grid">
          {DIAS_SEMANA.map((dia) => (
            <div key={dia} className="calendar-weekday">
              {dia}
            </div>
          ))}

          {dias.map(({ dataISO, dia, foraDoMes, tarefas }) => {
            const isSelected = dataISO === dataSelecionada
            const hasTasks = tarefas.length > 0
            return (
              <button
                key={dataISO}
                type="button"
                className={`calendar-day ${foraDoMes ? 'out-month' : ''} ${isSelected ? 'selected' : ''} ${hasTasks ? 'has-tasks' : ''}`}
                onClick={() => onChangeData(dataISO)}
              >
                <span className="calendar-day-number">{dia}</span>

                {tarefas.length > 0 && (
                  <ul className="calendar-day-tasks">
                    {tarefas.slice(0, 3).map((tarefa) => {
                      const statusClass = `status-${tarefa.status
                        .toLowerCase()
                        .normalize('NFD')
                        .replace(/[\u0300-\u036f]/g, '')
                        .replace(/\s+/g, '-')}`
                      return (
                        <li key={tarefa.id} title={tarefa.titulo}>
                          <span className={`status-dot ${statusClass}`} aria-hidden="true" />
                          <span className="calendar-task-title">{tarefa.titulo}</span>
                        </li>
                      )
                    })}
                    {tarefas.length > 3 && <li className="calendar-more">+{tarefas.length - 3} tarefas</li>}
                  </ul>
                )}
              </button>
            )
          })}
        </div>
      </div>

      <aside className="calendar-sidebar">
        <h4>
          Tarefas em{' '}
          {new Date(dataSelecionada + 'T00:00:00').toLocaleDateString('pt-BR', {
            weekday: 'long',
            day: 'numeric',
            month: 'long'
          })}
        </h4>

        {tarefasDoDia.length === 0 ? (
          <p className="empty-state">Nenhuma tarefa para esta data.</p>
        ) : (
          <ul className="calendar-task-list">
            {tarefasDoDia.map((tarefa) => (
              <li key={tarefa.id} className="calendar-task-card">
                <header>
                  <div>
                    <h5>{tarefa.titulo}</h5>
                    <small>{tarefa.produto}</small>
                    {tarefa.atribuidoIds.length > 0 && (
                      <ul className="assignee-list inline">
                        {tarefa.atribuidoIds
                          .map((id) => {
                            const usuario = usuariosPorId[id]
                            return usuario ? { id: usuario.id, nome: usuario.nome } : null
                          })
                          .filter((item): item is { id: string; nome: string } => Boolean(item))
                          .map(({ id, nome }) => (
                            <li key={id}>{nome}</li>
                          ))}
                      </ul>
                    )}
                  </div>

                  <select
                    value={tarefa.status}
                    onChange={(event) => onAlterarStatus(tarefa.id, event.target.value as Status)}
                    aria-label={`Alterar status da tarefa ${tarefa.titulo}`}
                    disabled={tarefa.status === 'CONCLUIDO'}
                  >
                    <option value="NOVO" disabled={tarefa.status !== 'NOVO'}>
                      Novo
                    </option>
                    <option value="EM ANDAMENTO">Em andamento</option>
                    <option value="PAUSADO">Pausado</option>
                    <option value="CONCLUIDO">Concluído</option>
                  </select>
                </header>

                <dl className="calendar-task-meta">
                  <div>
                    <dt>Tempo (h)</dt>
                    <dd>{tarefa.tempoTrabalhadoHoras ?? '—'}</dd>
                  </div>
                  <div>
                    <dt>Atualizada</dt>
                    <dd>{new Date(tarefa.atualizadaEm).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</dd>
                  </div>
                </dl>

                {tarefa.observacoes && <p className="observacoes">{tarefa.observacoes}</p>}

                <div className="calendar-task-actions">
                  <button
                    className="button ghost icon-button"
                    type="button"
                    onClick={() => onEditar(tarefa)}
                    aria-label="Editar tarefa"
                    title="Editar tarefa"
                  >
                    <IconEdit size={16} />
                  </button>
                  <button
                    className="button danger icon-button"
                    type="button"
                    onClick={() => onExcluir(tarefa.id)}
                    aria-label="Excluir tarefa"
                    title="Excluir tarefa"
                  >
                    <IconTrash size={16} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </aside>
    </div>
  )
}

