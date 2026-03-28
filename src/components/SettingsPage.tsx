import { useState, type FormEvent } from 'react'
import type { Produto, Executiva } from '../types'

type SettingsPageProps = {
  produtos: Produto[]
  onCriarProduto: (dados: { nome: string; executiva: Executiva }) => Promise<void>
  onAtualizarProduto: (id: string, dados: { nome?: string; executiva?: Executiva; ativo?: boolean }) => Promise<void>
  onRemoverProduto: (id: string) => Promise<void>
}

type FormProduto = {
  nome: string
  executiva: Executiva
}

const formInicial: FormProduto = {
  nome: '',
  executiva: 'SEVSAP'
}

export function SettingsPage({
  produtos,
  onCriarProduto,
  onAtualizarProduto,
  onRemoverProduto
}: SettingsPageProps) {
  const [form, setForm] = useState<FormProduto>(formInicial)
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [mensagem, setMensagem] = useState<string | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [processando, setProcessando] = useState(false)
  const [modalAberto, setModalAberto] = useState(false)

  const abrirModal = (produto?: Produto) => {
    if (produto) {
      setForm({ nome: produto.nome, executiva: produto.executiva ?? 'SEVSAP' })
      setEditandoId(produto.id)
    } else {
      setForm(formInicial)
      setEditandoId(null)
    }
    setErro(null)
    setModalAberto(true)
  }

  const fecharModal = () => {
    setModalAberto(false)
    setForm(formInicial)
    setEditandoId(null)
    setErro(null)
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setErro(null)

    const nomeNormalizado = form.nome.trim().toUpperCase()

    if (!nomeNormalizado) {
      setErro('Informe o nome do produto.')
      return
    }

    const duplicado = produtos.some(
      p => p.nome.toUpperCase() === nomeNormalizado && p.id !== editandoId
    )

    if (duplicado) {
      setErro('Já existe um produto com este nome.')
      return
    }

    setProcessando(true)

    try {
      if (editandoId) {
        await onAtualizarProduto(editandoId, {
          nome: nomeNormalizado,
          executiva: form.executiva
        })
        setMensagem('Produto atualizado com sucesso.')
      } else {
        await onCriarProduto({
          nome: nomeNormalizado,
          executiva: form.executiva
        })
        setMensagem('Produto criado com sucesso.')
      }
      fecharModal()
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro ao salvar produto.')
    } finally {
      setProcessando(false)
    }
  }

  const handleToggleAtivo = async (produto: Produto) => {
    try {
      await onAtualizarProduto(produto.id, { ativo: !produto.ativo })
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro ao atualizar produto.')
    }
  }

  const handleExcluir = async (produto: Produto) => {
    if (!confirm(`Confirma a exclusão do produto "${produto.nome}"?`)) return

    setProcessando(true)
    try {
      await onRemoverProduto(produto.id)
      setMensagem('Produto excluído com sucesso.')
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro ao excluir produto.')
    } finally {
      setProcessando(false)
    }
  }

  const totalAtivos = produtos.filter(p => p.ativo).length

  return (
    <>
      <div className="user-management">
        <header className="user-management-header">
          <div>
            <h3>Configurações</h3>
            <p>Gerencie os produtos disponíveis no sistema.</p>
          </div>
          <button type="button" className="button primary" onClick={() => abrirModal()} disabled={processando}>
            Novo produto
          </button>
        </header>

        {mensagem && !modalAberto && <p className="form-success">{mensagem}</p>}
        {erro && !modalAberto && <p className="form-error">{erro}</p>}

        <section className="user-management-list">
          <div className="panel-header">
            <h4>Produtos cadastrados</h4>
            <div className="metrics">
              <span className="badge">Total: {produtos.length}</span>
              <span className="badge admin">Ativos: {totalAtivos}</span>
            </div>
          </div>

          {produtos.length === 0 ? (
            <p className="empty-state">Nenhum produto cadastrado.</p>
          ) : (
            <div className="table-wrapper">
              <table className="task-table">
                <thead>
                  <tr>
                    <th>Nome</th>
                    <th>Executiva</th>
                    <th>Status</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {produtos.map((produto) => {
                    const isPessoal = produto.nome === 'PESSOAL'
                    return (
                      <tr key={produto.id}>
                        <td>{produto.nome}</td>
                        <td>
                          {produto.executiva ? (
                            <span className={`role-chip ${produto.executiva.toLowerCase()}`}>
                              {produto.executiva}
                            </span>
                          ) : (
                            <span className="text-muted">—</span>
                          )}
                        </td>
                        <td>
                          <span className={`status-chip ${produto.ativo ? 'ativo' : 'inativo'}`}>
                            {produto.ativo ? 'Ativo' : 'Inativo'}
                          </span>
                        </td>
                        <td className="actions-cell">
                          {isPessoal ? (
                            <span className="text-muted">Protegido</span>
                          ) : (
                            <div className="actions-wrap">
                              <button
                                type="button"
                                className="button ghost icon-button"
                                onClick={() => handleToggleAtivo(produto)}
                                title={produto.ativo ? 'Desativar' : 'Ativar'}
                                disabled={processando}
                              >
                                <span aria-hidden="true">{produto.ativo ? '🔴' : '🟢'}</span>
                              </button>
                              <button
                                type="button"
                                className="button ghost icon-button"
                                onClick={() => abrirModal(produto)}
                                title="Editar produto"
                                disabled={processando}
                              >
                                <span aria-hidden="true">✏️</span>
                              </button>
                              <button
                                type="button"
                                className="button danger icon-button"
                                onClick={() => handleExcluir(produto)}
                                title="Excluir produto"
                                disabled={processando}
                              >
                                <span aria-hidden="true">🗑️</span>
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      {modalAberto && (
        <div className="modal-backdrop">
          <div className="modal task-modal">
            <div className="modal-header">
              <h4>{editandoId ? 'Editar produto' : 'Novo produto'}</h4>
              <button type="button" className="button ghost" onClick={fecharModal} disabled={processando}>
                Fechar
              </button>
            </div>

            <form className="modal-form" onSubmit={handleSubmit}>
              <div className="field">
                <label htmlFor="produto-nome">
                  Nome <span className="required-marker">*</span>
                </label>
                <input
                  id="produto-nome"
                  type="text"
                  value={form.nome}
                  onChange={(e) => setForm({ ...form, nome: e.target.value })}
                  placeholder="Ex: SISGRADE"
                  required
                />
              </div>

              <div className="field">
                <label htmlFor="produto-executiva">
                  Executiva <span className="required-marker">*</span>
                </label>
                <select
                  id="produto-executiva"
                  value={form.executiva}
                  onChange={(e) => setForm({ ...form, executiva: e.target.value as Executiva })}
                >
                  <option value="SEVSAP">SEVSAP</option>
                  <option value="SEGTES">SEGTES</option>
                  <option value="GSAS">GSAS</option>
                </select>
              </div>

              {erro && <p className="form-error">{erro}</p>}

              <div className="modal-actions">
                <button type="button" className="button ghost" onClick={fecharModal} disabled={processando}>
                  Cancelar
                </button>
                <button type="submit" className="button primary" disabled={processando}>
                  {processando ? 'Salvando...' : editandoId ? 'Salvar alterações' : 'Criar produto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
