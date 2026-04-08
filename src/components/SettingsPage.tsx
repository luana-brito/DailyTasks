import { useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import type { Produto, Executiva } from '../types'
import {
  exportProdutosBackupApi,
  importProdutosBackupApi,
  removerProdutosInativosApi,
  type ProdutosBackupPayload
} from '../services/api'

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
  const inputImportRef = useRef<HTMLInputElement>(null)

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
        setMensagem('Produto criado com sucesso (ou atualizado se o nome já existia).')
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
  const totalInativos = produtos.length - totalAtivos

  const handleRemoverInativos = async () => {
    if (totalInativos === 0) {
      setErro('Não há produtos inativos para remover.')
      setMensagem(null)
      return
    }
    if (
      !confirm(
        `Remover permanentemente ${totalInativos} produto(s) inativo(s)? Tarefas que referenciem esses nomes mantêm o texto; apenas a linha do produto é apagada.`
      )
    ) {
      return
    }
    setErro(null)
    setMensagem(null)
    setProcessando(true)
    try {
      const res = await removerProdutosInativosApi()
      setMensagem(`Removidos ${res.removed} produto(s) inativo(s). A lista atualiza em segundos.`)
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro ao remover produtos inativos.')
    } finally {
      setProcessando(false)
    }
  }

  const handleExportarProdutos = async () => {
    setErro(null)
    setMensagem(null)
    setProcessando(true)
    try {
      const data = await exportProdutosBackupApi()
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `produtos-dailytasks-${new Date().toISOString().slice(0, 10)}.json`
      a.click()
      URL.revokeObjectURL(url)
      setMensagem('Produtos exportados. Use importação noutro ambiente para replicar a mesma lista.')
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Não foi possível exportar.')
    } finally {
      setProcessando(false)
    }
  }

  const handleImportarProdutos = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (
      !confirm(
        'Importar produtos deste ficheiro?\n\n' +
          '• Mesmo id = atualização.\n' +
          '• Nomes duplicados (outro id) na base são rejeitados.\n' +
          '• Importe utilizadores/tarefas noutro passo se necessário.'
      )
    ) {
      return
    }
    setProcessando(true)
    setErro(null)
    setMensagem(null)
    try {
      const text = await file.text()
      const parsed = JSON.parse(text) as unknown
      let payload: ProdutosBackupPayload | { produtos: ProdutosBackupPayload['produtos'] }
      if (Array.isArray(parsed)) {
        payload = { produtos: parsed as ProdutosBackupPayload['produtos'] }
      } else if (
        parsed &&
        typeof parsed === 'object' &&
        Array.isArray((parsed as ProdutosBackupPayload).produtos)
      ) {
        payload = parsed as ProdutosBackupPayload
      } else {
        throw new Error('Formato inválido: esperado { produtos: [...] } ou um array.')
      }
      const res = await importProdutosBackupApi(payload)
      const extra =
        res.sobrescritosPorNome && res.sobrescritosPorNome > 0
          ? ` (${res.sobrescritosPorNome} registo(s) existente(s) atualizado(s) pelo mesmo nome.)`
          : ''
      setMensagem(`Importação concluída: ${res.imported} produto(s).${extra} A lista atualiza em segundos.`)
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Não foi possível importar.')
    } finally {
      setProcessando(false)
    }
  }

  return (
    <>
      <div className="user-management">
        <header className="user-management-header">
          <div>
            <h3>Configurações</h3>
            <p>Gerencie os produtos disponíveis no sistema.</p>
          </div>
          <div className="user-management-header-actions">
            <button
              type="button"
              className="button secondary"
              onClick={handleExportarProdutos}
              disabled={processando}
              title="Descarregar produtos em JSON"
            >
              Exportar JSON
            </button>
            <button
              type="button"
              className="button secondary"
              onClick={() => inputImportRef.current?.click()}
              disabled={processando}
              title="Importar produtos a partir de JSON"
            >
              Importar JSON
            </button>
            <button
              type="button"
              className="button danger"
              onClick={handleRemoverInativos}
              disabled={processando || totalInativos === 0}
              title="Apaga da base todos os produtos com estado Inativo"
            >
              Apagar inativos ({totalInativos})
            </button>
            <input
              ref={inputImportRef}
              type="file"
              accept="application/json,.json"
              className="sr-only"
              aria-hidden
              tabIndex={-1}
              onChange={handleImportarProdutos}
            />
            <button type="button" className="button primary" onClick={() => abrirModal()} disabled={processando}>
              Novo produto
            </button>
          </div>
        </header>

        <p className="user-management-backup-hint">
          <strong>Exportar / Importar</strong>: o mesmo <strong>nome</strong> (sem distinguir maiúsculas) atualiza o
          produto já existente. No JSON, se o nome repetir, prevalece a última entrada. As tarefas guardam o nome como
          texto.
        </p>

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
