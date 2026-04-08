import { useRef, useState, type ChangeEvent } from 'react'
import {
  exportTarefasBackupApi,
  importTarefasBackupApi,
  type TarefasBackupPayload
} from '../services/api'

type TarefasBackupToolbarProps = {
  /** Só administradores devem ver ou usar export/import de tarefas. */
  isAdmin: boolean
}

/**
 * Exportar/importar tarefas em JSON — usar apenas com isAdmin={true}.
 */
export function TarefasBackupToolbar({ isAdmin }: TarefasBackupToolbarProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [processando, setProcessando] = useState(false)

  const exportar = async () => {
    setProcessando(true)
    try {
      const data = await exportTarefasBackupApi()
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `tarefas-dailytasks-${new Date().toISOString().slice(0, 10)}.json`
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setProcessando(false)
    }
  }

  const onFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (
      !confirm(
        'Importar tarefas deste ficheiro?\n\n' +
          '• Mesmo id = atualização; ids novos = inclusão.\n' +
          '• Subtarefas: o ficheiro exportado já está na ordem correta.\n' +
          '• Garanta que utilizadores e produtos existem (mesmos ids / nomes de produto).'
      )
    ) {
      return
    }
    setProcessando(true)
    try {
      const text = await file.text()
      const parsed = JSON.parse(text) as unknown
      let payload: TarefasBackupPayload | { tarefas: TarefasBackupPayload['tarefas'] }
      if (Array.isArray(parsed)) {
        payload = { tarefas: parsed as TarefasBackupPayload['tarefas'] }
      } else if (parsed && typeof parsed === 'object' && Array.isArray((parsed as TarefasBackupPayload).tarefas)) {
        payload = parsed as TarefasBackupPayload
      } else {
        throw new Error('Formato inválido: esperado { tarefas: [...] } ou um array.')
      }
      await importTarefasBackupApi(payload)
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Falha na importação.')
    } finally {
      setProcessando(false)
    }
  }

  if (!isAdmin) {
    return null
  }

  return (
    <>
      <button
        type="button"
        className="button secondary small"
        onClick={exportar}
        disabled={processando}
        title="Descarregar todas as tarefas (JSON)"
      >
        Exportar tarefas
      </button>
      <button
        type="button"
        className="button secondary small"
        onClick={() => inputRef.current?.click()}
        disabled={processando}
        title="Carregar backup JSON de tarefas"
      >
        Importar tarefas
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="application/json,.json"
        className="sr-only"
        aria-hidden
        tabIndex={-1}
        onChange={onFile}
      />
    </>
  )
}
