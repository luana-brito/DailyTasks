import type { Filtros, Produto, Status, Usuario } from '../types'

type FilterBarProps = {
  filtros: Filtros
  onChange: (filtros: Filtros) => void
  usuarios: Usuario[]
  usuarioAtualId?: string
}

const produtos: Array<Produto | 'TODOS'> = ['TODOS', 'SISGRADE', 'SIVOPE', 'CIEVS', 'GESTÃO']
const statusList: Array<Status | 'TODOS'> = ['TODOS', 'NOVO', 'EM ANDAMENTO', 'PAUSADO', 'CONCLUIDO']

export function FilterBar({ filtros, onChange, usuarios, usuarioAtualId }: FilterBarProps) {
  const isTodos = filtros.atribuicoes === 'TODOS'
  const isPersonalizado = Array.isArray(filtros.atribuicoes)
  const atribuicoesSelecionadas =
    Array.isArray(filtros.atribuicoes) && filtros.atribuicoes.length > 0
      ? filtros.atribuicoes
      : usuarioAtualId
        ? [usuarioAtualId]
        : []
  const modoAtribuicao = isTodos ? 'TODOS' : isPersonalizado ? 'PERSONALIZADO' : 'EU'

  const usuariosOrdenados = [...usuarios].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))

  const setAtribuicoes = (valor: 'TODOS' | string[]) => {
    onChange({ ...filtros, atribuicoes: valor })
  }

  const ativarSomenteEu = () => {
    if (!usuarioAtualId) return
    onChange({ ...filtros, atribuicoes: 'EU' })
  }

  const ativarPersonalizado = () => {
    if (Array.isArray(filtros.atribuicoes)) return
    if (usuarioAtualId) {
      setAtribuicoes([usuarioAtualId])
    } else if (usuariosOrdenados[0]) {
      setAtribuicoes([usuariosOrdenados[0].id])
    } else {
      setAtribuicoes([])
    }
  }

  const handlePersonalizadoChange = (ids: string[]) => {
    if (ids.length === 0) {
      onChange({ ...filtros, atribuicoes: 'EU' })
    } else {
      setAtribuicoes(ids)
    }
  }

  return (
    <section className="filters">
      <label>
        Data
        <input
          type="date"
          value={filtros.data}
          onChange={(event) => onChange({ ...filtros, data: event.target.value })}
        />
      </label>

      <label>
        Produto
        <select
          value={filtros.produto}
          onChange={(event) => onChange({ ...filtros, produto: event.target.value as Filtros['produto'] })}
        >
          {produtos.map((produto) => (
            <option key={produto} value={produto}>
              {produto === 'TODOS' ? 'Todos' : produto}
            </option>
          ))}
        </select>
      </label>

      <label>
        Status
        <select
          value={filtros.status}
          onChange={(event) => onChange({ ...filtros, status: event.target.value as Filtros['status'] })}
        >
          {statusList.map((status) => (
            <option key={status} value={status}>
              {status === 'TODOS' ? 'Todos' : status}
            </option>
          ))}
        </select>
      </label>

      <div className="filter-atribuidos">
        <span>Atribuído a</span>
        <div className="assignee-buttons">
          <button
            type="button"
            className={`chip-button ${modoAtribuicao === 'EU' ? 'active' : ''}`}
            onClick={ativarSomenteEu}
            disabled={!usuarioAtualId}
          >
            Somente eu
          </button>
          <button
            type="button"
            className={`chip-button ${modoAtribuicao === 'TODOS' ? 'active' : ''}`}
            onClick={() => setAtribuicoes('TODOS')}
          >
            Todos
          </button>
          <button
            type="button"
            className={`chip-button ${modoAtribuicao === 'PERSONALIZADO' ? 'active' : ''}`}
            onClick={ativarPersonalizado}
          >
            Personalizado
          </button>
        </div>

        {modoAtribuicao === 'PERSONALIZADO' && (
          <div className="checkbox-list">
            {usuariosOrdenados.map((usuario) => {
              const isChecked = atribuicoesSelecionadas.includes(usuario.id)
              return (
                <label key={usuario.id} className="checkbox-item">
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => {
                      const novosIds = isChecked
                        ? atribuicoesSelecionadas.filter((id) => id !== usuario.id)
                        : [...atribuicoesSelecionadas, usuario.id]
                      handlePersonalizadoChange(novosIds)
                    }}
                  />
                  <span>{usuario.nome}</span>
                </label>
              )
            })}
          </div>
        )}
      </div>
    </section>
  )
}

