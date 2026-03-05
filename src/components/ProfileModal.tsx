import { useState, useEffect } from 'react'
import type { Usuario } from '../types'
import { IconUser, IconSave, IconX } from './Icons'

type ProfileModalProps = {
  aberto: boolean
  usuario: Usuario
  onClose: () => void
  onSave: (dados: {
    nome: string
    email: string
    telefone: string
    senha?: string
  }) => Promise<void>
}

export function ProfileModal({ aberto, usuario, onClose, onSave }: ProfileModalProps) {
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [telefone, setTelefone] = useState('')
  const [novaSenha, setNovaSenha] = useState('')
  const [confirmarSenha, setConfirmarSenha] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [sucesso, setSucesso] = useState(false)

  useEffect(() => {
    if (aberto && usuario) {
      setNome(usuario.nome)
      setEmail(usuario.email)
      setTelefone(formatarTelefone(usuario.telefone))
      setNovaSenha('')
      setConfirmarSenha('')
      setErro(null)
      setSucesso(false)
    }
  }, [aberto, usuario])

  const formatarTelefone = (valor: string) => {
    const numeros = valor.replace(/\D/g, '')
    if (numeros.length <= 2) return numeros
    if (numeros.length <= 7) return `(${numeros.slice(0, 2)}) ${numeros.slice(2)}`
    if (numeros.length <= 11) return `(${numeros.slice(0, 2)}) ${numeros.slice(2, 7)}-${numeros.slice(7)}`
    return `(${numeros.slice(0, 2)}) ${numeros.slice(2, 7)}-${numeros.slice(7, 11)}`
  }

  const handleTelefoneChange = (valor: string) => {
    setTelefone(formatarTelefone(valor))
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setErro(null)
    setSucesso(false)

    if (!nome.trim()) {
      setErro('Nome é obrigatório')
      return
    }

    if (!email.trim()) {
      setErro('E-mail é obrigatório')
      return
    }

    const telefoneNumeros = telefone.replace(/\D/g, '')
    if (telefoneNumeros.length < 10) {
      setErro('Telefone deve ter pelo menos 10 dígitos')
      return
    }

    if (novaSenha && novaSenha !== confirmarSenha) {
      setErro('As senhas não conferem')
      return
    }

    if (novaSenha && novaSenha.length < 4) {
      setErro('A nova senha deve ter pelo menos 4 caracteres')
      return
    }

    setSalvando(true)

    try {
      await onSave({
        nome: nome.trim(),
        email: email.trim(),
        telefone: telefoneNumeros,
        senha: novaSenha || undefined
      })
      setSucesso(true)
      setTimeout(() => {
        onClose()
      }, 1500)
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro ao salvar')
    } finally {
      setSalvando(false)
    }
  }

  if (!aberto) return null

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal profile-modal">
        <header className="modal-header">
          <div className="modal-title">
            <IconUser size={20} />
            <h2>Meu Perfil</h2>
          </div>
          <button className="button ghost icon-button" onClick={onClose} type="button" title="Fechar">
            <IconX size={20} />
          </button>
        </header>

        <form className="modal-form" onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="profile-login">Login</label>
            <input
              id="profile-login"
              type="text"
              value={usuario.login}
              disabled
              className="input-disabled"
            />
            <span className="helper-text">O login não pode ser alterado</span>
          </div>

          <div className="field">
            <label htmlFor="profile-nome">
              Nome <span className="required-marker">*</span>
            </label>
            <input
              id="profile-nome"
              type="text"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Seu nome completo"
              required
            />
          </div>

          <div className="field">
            <label htmlFor="profile-email">
              E-mail <span className="required-marker">*</span>
            </label>
            <input
              id="profile-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              required
            />
          </div>

          <div className="field">
            <label htmlFor="profile-telefone">
              Telefone <span className="required-marker">*</span>
            </label>
            <input
              id="profile-telefone"
              type="tel"
              value={telefone}
              onChange={(e) => handleTelefoneChange(e.target.value)}
              placeholder="(11) 99999-9999"
              required
            />
          </div>

          <div className="profile-divider">
            <span>Alterar senha (opcional)</span>
          </div>

          <div className="field">
            <label htmlFor="profile-nova-senha">Nova senha</label>
            <input
              id="profile-nova-senha"
              type="password"
              value={novaSenha}
              onChange={(e) => setNovaSenha(e.target.value)}
              placeholder="Deixe em branco para manter a atual"
            />
          </div>

          <div className="field">
            <label htmlFor="profile-confirmar-senha">Confirmar nova senha</label>
            <input
              id="profile-confirmar-senha"
              type="password"
              value={confirmarSenha}
              onChange={(e) => setConfirmarSenha(e.target.value)}
              placeholder="Repita a nova senha"
            />
          </div>

          {erro && <p className="form-error">{erro}</p>}
          {sucesso && <p className="form-success">Perfil atualizado com sucesso!</p>}

          <div className="modal-actions">
            <button type="button" className="button secondary" onClick={onClose} disabled={salvando}>
              Cancelar
            </button>
            <button type="submit" className="button primary" disabled={salvando}>
              <IconSave size={16} />
              <span>{salvando ? 'Salvando...' : 'Salvar'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
