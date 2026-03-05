import type { FormEvent } from 'react'

type TimeModalProps = {
  aberto: boolean
  valorAtual?: number
  onConfirmar: (tempoHoras: number) => void
  onCancelar: () => void
}

export function TimeModal({ aberto, valorAtual, onConfirmar, onCancelar }: TimeModalProps) {
  if (!aberto) return null

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    const tempoHoras = Number(formData.get('tempoHoras'))

    if (Number.isNaN(tempoHoras) || tempoHoras < 0) {
      alert('Informe um tempo válido em horas (valor numérico maior ou igual a zero).')
      return
    }

    onConfirmar(tempoHoras)
  }

  return (
    <div className="modal-backdrop">
      <div className="modal">
        <h2>Tempo trabalhado</h2>
        <p>Informe o tempo trabalhado na tarefa concluída (em horas).</p>

        <form onSubmit={handleSubmit} className="modal-form">
          <input
            type="number"
            name="tempoHoras"
            min={0}
            step={0.25}
            defaultValue={valorAtual ?? ''}
            placeholder="Ex.: 1.5"
          />

          <div className="modal-actions">
            <button type="button" className="button ghost" onClick={onCancelar}>
              Cancelar
            </button>
            <button type="submit" className="button primary">
              Salvar tempo
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

