import { useState } from 'react'
import { ThemeToggle, useThemeInit } from './ThemeToggle'
import { IconLayers } from './Icons'

type LoginCredenciais = {
  login: string
  senha: string
}

type LoginScreenProps = {
  onSubmit: (credenciais: LoginCredenciais) => Promise<void> | void
  carregando?: boolean
  erro?: string | null
}

export function LoginScreen({ onSubmit, carregando = false, erro = null }: LoginScreenProps) {
  useThemeInit()
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!email.trim() || !senha.trim()) return
    await onSubmit({ login: email.trim(), senha })
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
          <p>Gerencie suas tarefas diárias de forma simples e eficiente</p>
        </header>

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

          <button type="submit" className="button primary" disabled={carregando} style={{ width: '100%', padding: '0.875rem' }}>
            {carregando ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  )
}

export type { LoginCredenciais }


