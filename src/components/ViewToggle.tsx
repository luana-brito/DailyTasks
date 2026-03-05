import { IconTable, IconKanban, IconCalendar } from './Icons'

type ViewMode = 'tabela' | 'kanban' | 'calendario'

type ViewToggleProps = {
  modo: ViewMode
  onChange: (modo: ViewMode) => void
}

export function ViewToggle({ modo, onChange }: ViewToggleProps) {
  return (
    <div className="view-toggle">
      <button
        type="button"
        className={`toggle-button ${modo === 'tabela' ? 'active' : ''}`}
        onClick={() => onChange('tabela')}
        title="Visualização em tabela"
      >
        <IconTable size={16} />
        <span>Tabela</span>
      </button>
      <button
        type="button"
        className={`toggle-button ${modo === 'kanban' ? 'active' : ''}`}
        onClick={() => onChange('kanban')}
        title="Visualização Kanban"
      >
        <IconKanban size={16} />
        <span>Kanban</span>
      </button>
      <button
        type="button"
        className={`toggle-button ${modo === 'calendario' ? 'active' : ''}`}
        onClick={() => onChange('calendario')}
        title="Visualização em calendário"
      >
        <IconCalendar size={16} />
        <span>Calendário</span>
      </button>
    </div>
  )
}

export type { ViewMode }


