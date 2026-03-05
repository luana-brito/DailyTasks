import { useState } from 'react'
import { ThemeToggle, useThemeInit } from './ThemeToggle'
import { IconLayers } from './Icons'

type LoginCredenciais = {
  login: string
  senha: string
}

type LoginScreenProps = {
  onSubmit: (credenciais: LoginCredenciais) => Promise<void> | void
  onRecuperarSenha: (email: string) => Promise<void>
  carregando?: boolean
  erro?: string | null
}

export function LoginScreen({ onSubmit, onRecuperarSenha, carregando = false, erro = null }: LoginScreenProps) {
  useThemeInit()
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [modoRecuperacao, setModoRecuperacao] = useState(false)
  const [mensagemRecuperacao, setMensagemRecuperacao] = useState<string | null>(null)
  const [erroRecuperacao, setErroRecuperacao] = useState<string | null>(null)
  const [enviandoRecuperacao, setEnviandoRecuperacao] = useState(false)

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!email.trim() || !senha.trim()) return
    await onSubmit({ login: email.trim(), senha })
  }

  const handleRecuperarSenha = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!email.trim()) return
    
    setErroRecuperacao(null)
    setMensagemRecuperacao(null)
    setEnviandoRecuperacao(true)
    
    try {
      await onRecuperarSenha(email.trim())
      setMensagemRecuperacao('E-mail de recuperação enviado! Verifique sua caixa de entrada.')
    } catch (err) {
      setErroRecuperacao(err instanceof Error ? err.message : 'Erro ao enviar e-mail')
    } finally {
      setEnviandoRecuperacao(false)
    }
  }

  const voltarParaLogin = () => {
    setModoRecuperacao(false)
    setMensagemRecuperacao(null)
    setErroRecuperacao(null)
  }

  return (
    <div className="login-wrapper">
      <div className="login-card">
        <div style={{ position: 'absolute', top: '1rem', right: '1rem' }}>
          <ThemeToggle />
        </div>
        
        <header>
          <div className="login-logo">
            <IconLayers size={40} />
          </div>
          <h1>Daily Tasks</h1>
          <p>
            {modoRecuperacao 
              ? 'Recupere o acesso à sua conta' 
              : 'Gerencie suas tarefas diárias de forma simples e eficiente'
            }
          </p>
        </header>

        {modoRecuperacao ? (
          <form className="login-form" onSubmit={handleRecuperarSenha}>
            <div className="field">
              <label htmlFor="email-recuperacao">E-mail institucional</label>
              <input
                id="email-recuperacao"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="usuario@saude.pe.gov.br"
                required
              />
            </div>

            {erroRecuperacao && <p className="login-error">{erroRecuperacao}</p>}
            {mensagemRecuperacao && <p className="login-success">{mensagemRecuperacao}</p>}

            <button 
              type="submit" 
              className="button primary" 
              disabled={enviandoRecuperacao} 
              style={{ width: '100%', padding: '0.875rem' }}
            >
              {enviandoRecuperacao ? 'Enviando...' : 'Enviar e-mail de recuperação'}
            </button>

            <button 
              type="button" 
              className="button ghost" 
              onClick={voltarParaLogin}
              style={{ width: '100%', marginTop: '0.5rem' }}
            >
              Voltar para o login
            </button>
          </form>
        ) : (
          <form className="login-form" onSubmit={handleSubmit}>
            <div className="field">
              <label htmlFor="email">E-mail institucional</label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="usuario@saude.pe.gov.br"
                required
              />
            </div>

            <div className="field">
              <label htmlFor="senha">Senha</label>
              <input
                id="senha"
                type="password"
                autoComplete="current-password"
                value={senha}
                onChange={(event) => setSenha(event.target.value)}
                placeholder="Digite sua senha"
                required
              />
            </div>

            {erro && <p className="login-error">{erro}</p>}

            <button 
              type="submit" 
              className="button primary" 
              disabled={carregando} 
              style={{ width: '100%', padding: '0.875rem' }}
            >
              {carregando ? 'Entrando...' : 'Entrar'}
            </button>

            <button 
              type="button" 
              className="forgot-password-link" 
              onClick={() => setModoRecuperacao(true)}
            >
              Esqueci minha senha
            </button>
          </form>
        )}
      </div>
    </div>
  )
}

export type { LoginCredenciais }
