import { type FormEvent, useEffect, useState } from 'react'
import { horasDecimaisParaStringHm, parseStringHmParaHorasDecimais } from '../utils/tempoTrabalhado'

type TimeModalProps = {
  aberto: boolean
  valorAtual?: number
  /** Preenchimento sugerido (ex.: tempo do cronômetro), se não houver valorAtual */
  sugestaoHoras?: number
  onConfirmar: (tempoHoras: number) => void
  onCancelar: () => void
}

export function TimeModal({
  aberto,
  valorAtual,
  sugestaoHoras,
  onConfirmar,
  onCancelar
}: TimeModalProps) {
  const [tempoStr, setTempoStr] = useState('')

  useEffect(() => {
    if (!aberto) return
    const dec =
      valorAtual != null && !Number.isNaN(valorAtual)
        ? valorAtual
        : sugestaoHoras != null && !Number.isNaN(sugestaoHoras) && sugestaoHoras > 0
          ? sugestaoHoras
          : undefined
    setTempoStr(horasDecimaisParaStringHm(dec))
  }, [aberto, valorAtual, sugestaoHoras])

  if (!aberto) return null

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const bruto = tempoStr.trim()
    const tempo = parseStringHmParaHorasDecimais(tempoStr)

    if (bruto === '' || tempo === undefined || tempo < 0) {
      alert('Informe o tempo no formato HH:MM (ex.: 01:30). Minutos de 00 a 59.')
      return
    }

    onConfirmar(tempo)
  }

  return (
    <div className="modal-backdrop">
      <div className="modal">
        <h2>Tempo trabalhado</h2>
        <p>Informe o tempo trabalhado na tarefa concluída (HH:MM). O valor pode ser ajustado.</p>

        <form onSubmit={handleSubmit} className="modal-form">
          <input
            className="input-tempo-hhmm"
            type="text"
            inputMode="numeric"
            autoComplete="off"
            spellCheck={false}
            placeholder="01:30"
            value={tempoStr}
            onChange={(event) => setTempoStr(event.target.value)}
            onBlur={() => {
              const p = parseStringHmParaHorasDecimais(tempoStr)
              if (p != null) setTempoStr(horasDecimaisParaStringHm(p))
            }}
            aria-label="Tempo em HH:MM"
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
