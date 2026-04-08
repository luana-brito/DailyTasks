import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import type { Usuario, UsuarioRole, UsuarioStatus, SolicitacaoCadastro } from '../types'
import {
  exportUsuariosBackupApi,
  importUsuariosBackupApi,
  type UsuariosBackupPayload
} from '../services/api'
import { IconCheck, IconX } from './Icons'

type UsuarioFormValores = {
  login: string
  nome: string
  email: string
  status: UsuarioStatus
  role: UsuarioRole
  telefone: string
  senha?: string
}

type UserManagementProps = {
  usuarios: Usuario[]
  usuarioAtual: Usuario
  solicitacoes: SolicitacaoCadastro[]
  onCreate: (dados: UsuarioFormValores) => Promise<void>
  onUpdate: (id: string, dados: UsuarioFormValores) => Promise<void>
  onDelete: (id: string) => Promise<void>
  onAprovarSolicitacao: (solicitacao: SolicitacaoCadastro, senha: string) => Promise<void>
  onRecusarSolicitacao: (id: string) => Promise<void>
}

const estadoInicial = (): UsuarioFormValores => ({
  login: '',
  nome: '',
  email: '',
  status: 'ATIVO',
  role: 'USUARIO',
  telefone: '',
  senha: ''
})

export function UserManagement({ 
  usuarios, 
  usuarioAtual, 
  solicitacoes,
  onCreate, 
  onUpdate, 
  onDelete,
  onAprovarSolicitacao,
  onRecusarSolicitacao
}: UserManagementProps) {
  const [form, setForm] = useState<UsuarioFormValores>(estadoInicial())
  const [modo, setModo] = useState<'criar' | 'editar'>('criar')
  const [usuarioEditando, setUsuarioEditando] = useState<Usuario | null>(null)
  const [mensagem, setMensagem] = useState<string | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [processando, setProcessando] = useState(false)
  const [modalAberto, setModalAberto] = useState(false)
  const [modalAprovacao, setModalAprovacao] = useState<SolicitacaoCadastro | null>(null)
  const [senhaAprovacao, setSenhaAprovacao] = useState('')
  const inputImportRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (usuarioEditando) {
      setForm({
        login: usuarioEditando.login,
        nome: usuarioEditando.nome,
        email: usuarioEditando.email,
        status: usuarioEditando.status,
        role: usuarioEditando.role,
        telefone: usuarioEditando.telefone,
        senha: ''
      })
    } else {
      setForm(estadoInicial())
    }
  }, [usuarioEditando])

  const totalAtivos = useMemo(() => usuarios.filter((usuario) => usuario.status === 'ATIVO').length, [usuarios])
  const totalAdmins = useMemo(() => usuarios.filter((usuario) => usuario.role === 'ADMIN').length, [usuarios])

  const handleChange = (campo: keyof UsuarioFormValores, valor: string) => {
    setForm((atual) => ({
      ...atual,
      [campo]: valor
    }))
  }

  const abrirModalCriar = () => {
    setModo('criar')
    setUsuarioEditando(null)
    setForm(estadoInicial())
    setErro(null)
    setMensagem(null)
    setModalAberto(true)
  }

  const iniciarEdicao = (usuario: Usuario) => {
    setModo('editar')
    setUsuarioEditando(usuario)
    setErro(null)
    setMensagem(null)
    setModalAberto(true)
  }

  const fecharModal = () => {
    setModalAberto(false)
    setModo('criar')
    setUsuarioEditando(null)
    setForm(estadoInicial())
    setErro(null)
  }

  const abrirModalAprovacao = (solicitacao: SolicitacaoCadastro) => {
    setModalAprovacao(solicitacao)
    setSenhaAprovacao('')
    setErro(null)
  }

  const fecharModalAprovacao = () => {
    setModalAprovacao(null)
    setSenhaAprovacao('')
    setErro(null)
  }

  const handleAprovar = async () => {
    if (!modalAprovacao) return
    
    if (!senhaAprovacao.trim() || senhaAprovacao.length < 6) {
      setErro('A senha deve ter pelo menos 6 caracteres.')
      return
    }

    try {
      setProcessando(true)
      await onAprovarSolicitacao(modalAprovacao, senhaAprovacao)
      setMensagem(`Solicitação de ${modalAprovacao.nome} aprovada com sucesso.`)
      fecharModalAprovacao()
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro ao aprovar solicitação')
    } finally {
      setProcessando(false)
    }
  }

  const handleRecusar = async (solicitacao: SolicitacaoCadastro) => {
    if (!confirm(`Tem certeza que deseja recusar a solicitação de ${solicitacao.nome}?`)) return
    
    try {
      setProcessando(true)
      await onRecusarSolicitacao(solicitacao.id)
      setMensagem(`Solicitação de ${solicitacao.nome} recusada.`)
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro ao recusar solicitação')
    } finally {
      setProcessando(false)
    }
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setErro(null)

    if (!form.login.trim() || !form.nome.trim() || !form.email.trim()) {
      setErro('Preencha os campos obrigatórios.')
      return
    }

    if (!form.email.includes('@')) {
      setErro('Informe um e-mail válido.')
      return
    }

    if (modo === 'criar' && !form.senha?.trim()) {
      setErro('Defina uma senha para o novo usuário.')
      return
    }

    if (!form.telefone.trim()) {
      setErro('Informe o telefone com DDD.')
      return
    }

    try {
      setProcessando(true)
      if (modo === 'criar') {
        await onCreate(form)
        setMensagem('Usuário criado com sucesso.')
        fecharModal()
      } else if (usuarioEditando) {
        await onUpdate(usuarioEditando.id, form)
        setMensagem('Usuário atualizado com sucesso.')
        fecharModal()
      }
    } catch (err) {
      if (err instanceof Error) {
        setErro(err.message)
      } else {
        setErro('Não foi possível salvar o usuário.')
      }
    } finally {
      setProcessando(false)
    }
  }

  const handleExcluir = async (usuario: Usuario) => {
    if (usuario.id === usuarioAtual.id) {
      setErro('Você não pode excluir o próprio usuário logado.')
      return
    }

    if (totalAtivos <= 1 && usuario.status === 'ATIVO') {
      setErro('Não é possível excluir o último usuário ativo.')
      return
    }

    if (usuario.role === 'ADMIN' && totalAdmins <= 1) {
      setErro('Não é possível excluir o último administrador.')
      return
    }

    if (!confirm(`Confirma a exclusão do usuário ${usuario.nome}?`)) return

    try {
      setProcessando(true)
      await onDelete(usuario.id)
      setMensagem('Usuário excluído com sucesso.')
      setErro(null)
      if (usuarioEditando?.id === usuario.id) {
        fecharModal()
      }
    } catch (err) {
      if (err instanceof Error) {
        setErro(err.message)
      } else {
        setErro('Não foi possível excluir o usuário.')
      }
    } finally {
      setProcessando(false)
    }
  }

  const handleExportarUsuarios = async () => {
    setErro(null)
    setMensagem(null)
    setProcessando(true)
    try {
      const data = await exportUsuariosBackupApi()
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `usuarios-dailytasks-${new Date().toISOString().slice(0, 10)}.json`
      a.click()
      URL.revokeObjectURL(url)
      setMensagem(
        'Exportação concluída. O ficheiro contém hashes de senha — guarde-o com segurança e não o partilhe.'
      )
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Não foi possível exportar.')
    } finally {
      setProcessando(false)
    }
  }

  const handleEscolherImportar = () => {
    setErro(null)
    setMensagem(null)
    inputImportRef.current?.click()
  }

  const handleFicheiroImport = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return

    if (
      !confirm(
        'Importar utilizadores a partir deste ficheiro?\n\n' +
          '• Utilizadores com o mesmo id serão atualizados.\n' +
          '• É necessário existir pelo menos um administrador ativo após a importação.\n' +
          '• E-mails duplicados com ids diferentes serão rejeitados.'
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
      let payload: UsuariosBackupPayload | { users: UsuariosBackupPayload['users'] }
      if (Array.isArray(parsed)) {
        payload = { users: parsed as UsuariosBackupPayload['users'] }
      } else if (parsed && typeof parsed === 'object' && Array.isArray((parsed as UsuariosBackupPayload).users)) {
        payload = parsed as UsuariosBackupPayload
      } else {
        throw new Error('Formato inválido: esperado { users: [...] } ou um array de utilizadores.')
      }
      const res = await importUsuariosBackupApi(payload)
      setMensagem(`Importação concluída: ${res.imported} utilizador(es) processado(s). A lista atualiza em segundos.`)
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
            <h3>Gestão de Usuários</h3>
            <p>Controle quem pode acessar o painel de tarefas.</p>
          </div>
          <div className="user-management-header-actions">
            <button
              type="button"
              className="button secondary"
              onClick={handleExportarUsuarios}
              disabled={processando}
              title="Descarregar JSON com todos os utilizadores (inclui hashes de senha)"
            >
              Exportar JSON
            </button>
            <button
              type="button"
              className="button secondary"
              onClick={handleEscolherImportar}
              disabled={processando}
              title="Carregar ficheiro exportado desta ou de outra instalação"
            >
              Importar JSON
            </button>
            <input
              ref={inputImportRef}
              type="file"
              accept="application/json,.json"
              className="sr-only"
              aria-hidden
              tabIndex={-1}
              onChange={handleFicheiroImport}
            />
            <button type="button" className="button primary" onClick={abrirModalCriar} disabled={processando}>
              Novo usuário
            </button>
          </div>
        </header>

        <p className="user-management-backup-hint">
          Use <strong>Exportar</strong> para cópia de segurança ou para migrar contas para outro servidor.{' '}
          <strong>Importar</strong> faz criação/atualização por <code>id</code>; palavras-passe mantêm-se se o
          ficheiro tiver os hashes originais.
        </p>

        {mensagem && !modalAberto && !modalAprovacao && <p className="form-success">{mensagem}</p>}
        {erro && !modalAberto && !modalAprovacao && <p className="form-error">{erro}</p>}

        {solicitacoes.length > 0 && (
          <section className="user-management-requests">
            <div className="panel-header">
              <h4>Solicitações Pendentes</h4>
              <span className="badge warning">{solicitacoes.length} pendente(s)</span>
            </div>

            <div className="requests-list">
              {solicitacoes.map((solicitacao) => (
                <div key={solicitacao.id} className="request-card">
                  <div className="request-info">
                    <strong>{solicitacao.nome}</strong>
                    <span>{solicitacao.email}</span>
                    <span>{solicitacao.telefone}</span>
                    {solicitacao.motivo && (
                      <p className="request-motivo">{solicitacao.motivo}</p>
                    )}
                    <small>Solicitado em: {new Date(solicitacao.criadoEm).toLocaleString('pt-BR')}</small>
                  </div>
                  <div className="request-actions">
                    <button
                      type="button"
                      className="button primary small"
                      onClick={() => abrirModalAprovacao(solicitacao)}
                      disabled={processando}
                    >
                      <IconCheck size={14} />
                      Aprovar
                    </button>
                    <button
                      type="button"
                      className="button danger small"
                      onClick={() => handleRecusar(solicitacao)}
                      disabled={processando}
                    >
                      <IconX size={14} />
                      Recusar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="user-management-list">
          <div className="panel-header">
            <h4>Usuários cadastrados</h4>
            <div className="metrics">
              <span className="badge">Ativos: {totalAtivos}</span>
              <span className="badge admin">Admins: {totalAdmins}</span>
            </div>
          </div>

          {usuarios.length === 0 ? (
            <p className="empty-state">Nenhum usuário cadastrado.</p>
          ) : (
            <div className="table-wrapper usuarios">
              <table className="task-table usuarios-table">
                <thead>
                  <tr>
                    <th>Login</th>
                    <th>Nome</th>
                    <th>Email</th>
                    <th>Status</th>
                    <th>Perfil</th>
                    <th>Telefone</th>
                    <th>Criado em</th>
                    <th>Atualizado em</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {usuarios.map((usuario) => (
                    <tr key={usuario.id}>
                      <td>{usuario.login}</td>
                      <td>{usuario.nome}</td>
                      <td>{usuario.email}</td>
                      <td>
                        <span className={`status-chip ${usuario.status.toLowerCase()}`}>
                          {usuario.status === 'ATIVO' ? 'Ativo' : 'Inativo'}
                        </span>
                      </td>
                      <td>
                        <span className={`role-chip ${usuario.role.toLowerCase()}`}>
                          {usuario.role === 'ADMIN' ? 'Administrador' : 'Usuário'}
                        </span>
                      </td>
                      <td>{usuario.telefone || '—'}</td>
                      <td>{new Date(usuario.criadoEm).toLocaleString('pt-BR')}</td>
                      <td>{new Date(usuario.atualizadoEm).toLocaleString('pt-BR')}</td>
                      <td className="actions-cell">
                        <div className="actions-wrap">
                          <button
                            type="button"
                            className="button ghost icon-button"
                            onClick={() => iniciarEdicao(usuario)}
                            title="Editar usuário"
                            aria-label="Editar usuário"
                            disabled={processando}
                          >
                            <span aria-hidden="true">✏️</span>
                          </button>
                          <button
                            type="button"
                            className="button danger icon-button"
                            onClick={() => handleExcluir(usuario)}
                            title="Excluir usuário"
                            aria-label="Excluir usuário"
                            disabled={processando || usuario.id === usuarioAtual.id}
                          >
                            <span aria-hidden="true">🗑️</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
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
              <h4>{modo === 'criar' ? 'Cadastrar usuário' : `Editar usuário (${usuarioEditando?.nome ?? ''})`}</h4>
              <button
                type="button"
                className="button ghost"
                onClick={fecharModal}
                disabled={processando}
              >
                Fechar
              </button>
            </div>

            <form className="modal-form" onSubmit={handleSubmit}>
              <div className="field-group">
                <div className="field">
                  <label htmlFor="usuario-login">
                    Login <span className="required-marker">*</span>
                  </label>
                  <input
                    id="usuario-login"
                    value={form.login}
                    onChange={(event) => handleChange('login', event.target.value)}
                    placeholder="Ex.: jsilva"
                    required
                    disabled={modo === 'editar'}
                  />
                </div>

                <div className="field">
                  <label htmlFor="usuario-nome">
                    Nome <span className="required-marker">*</span>
                  </label>
                  <input
                    id="usuario-nome"
                    value={form.nome}
                    onChange={(event) => handleChange('nome', event.target.value)}
                    placeholder="Nome completo"
                    required
                  />
                </div>
              </div>

              <div className="field-group">
                <div className="field">
                  <label htmlFor="usuario-email">
                    Email <span className="required-marker">*</span>
                  </label>
                  <input
                    id="usuario-email"
                    type="email"
                    value={form.email}
                    onChange={(event) => handleChange('email', event.target.value)}
                    placeholder="nome@empresa.com"
                    required
                  />
                </div>

                <div className="field">
                  <label htmlFor="usuario-status">
                    Status <span className="required-marker">*</span>
                  </label>
                  <select
                    id="usuario-status"
                    value={form.status}
                    onChange={(event) => handleChange('status', event.target.value as UsuarioStatus)}
                  >
                    <option value="ATIVO">Ativo</option>
                    <option value="INATIVO">Inativo</option>
                  </select>
                </div>

                <div className="field">
                  <label htmlFor="usuario-role">
                    Perfil <span className="required-marker">*</span>
                  </label>
                  <select
                    id="usuario-role"
                    value={form.role}
                    onChange={(event) => handleChange('role', event.target.value as UsuarioRole)}
                  >
                    <option value="USUARIO">Usuário</option>
                    <option value="ADMIN">Administrador</option>
                  </select>
                </div>
              </div>

              <div className="field">
                <label htmlFor="usuario-senha">
                  {modo === 'criar' ? 'Senha' : 'Senha (preencha para redefinir)'}
                </label>
                <input
                  id="usuario-senha"
                  type="password"
                  autoComplete="new-password"
                  value={form.senha ?? ''}
                  onChange={(event) => handleChange('senha', event.target.value)}
                  placeholder={modo === 'criar' ? 'Defina uma senha' : 'Redefinir senha'}
                />
              </div>

              <div className="field">
                <label htmlFor="usuario-telefone">
                  Telefone (com DDD) <span className="required-marker">*</span>
                </label>
                <input
                  id="usuario-telefone"
                  type="tel"
                  value={form.telefone}
                  onChange={(event) => handleChange('telefone', event.target.value)}
                  placeholder="Ex.: 5511999999999"
                  required
                />
              </div>

              {erro && <p className="form-error">{erro}</p>}

              <div className="modal-actions">
                <button
                  type="button"
                  className="button ghost"
                  onClick={fecharModal}
                  disabled={processando}
                >
                  Cancelar
                </button>
                <button type="submit" className="button primary" disabled={processando}>
                  {processando ? 'Salvando...' : modo === 'criar' ? 'Adicionar usuário' : 'Salvar alterações'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {modalAprovacao && (
        <div className="modal-backdrop">
          <div className="modal task-modal">
            <div className="modal-header">
              <h4>Aprovar Solicitação</h4>
              <button
                type="button"
                className="button ghost"
                onClick={fecharModalAprovacao}
                disabled={processando}
              >
                Fechar
              </button>
            </div>

            <div className="modal-form">
              <div className="approval-info">
                <p><strong>Nome:</strong> {modalAprovacao.nome}</p>
                <p><strong>E-mail:</strong> {modalAprovacao.email}</p>
                <p><strong>Telefone:</strong> {modalAprovacao.telefone}</p>
                {modalAprovacao.motivo && (
                  <p><strong>Motivo:</strong> {modalAprovacao.motivo}</p>
                )}
              </div>

              <div className="field">
                <label htmlFor="senha-aprovacao">
                  Defina uma senha para o novo usuário <span className="required-marker">*</span>
                </label>
                <input
                  id="senha-aprovacao"
                  type="password"
                  value={senhaAprovacao}
                  onChange={(e) => setSenhaAprovacao(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  autoComplete="new-password"
                />
              </div>

              {erro && <p className="form-error">{erro}</p>}

              <div className="modal-actions">
                <button
                  type="button"
                  className="button ghost"
                  onClick={fecharModalAprovacao}
                  disabled={processando}
                >
                  Cancelar
                </button>
                <button 
                  type="button" 
                  className="button primary" 
                  onClick={handleAprovar}
                  disabled={processando}
                >
                  {processando ? 'Aprovando...' : 'Aprovar e criar usuário'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

