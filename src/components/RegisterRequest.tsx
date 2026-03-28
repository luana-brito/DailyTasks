import { useState } from 'react'
import { ThemeToggle, useThemeInit } from './ThemeToggle'
import { IconLayers } from './Icons'

type RegisterRequestProps = {
  onSubmit: (dados: {
    nome: string
    email: string
    telefone: string
    motivo?: string
  }) => Promise<void>
  onVoltar: () => void
}

export function RegisterRequest({ onSubmit, onVoltar }: RegisterRequestProps) {
  useThemeInit()
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [telefone, setTelefone] = useState('')
  const [motivo, setMotivo] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [sucesso, setSucesso] = useState(false)

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    
    if (!nome.trim() || !email.trim() || !telefone.trim()) {
      setErro('Preencha todos os campos obrigatórios.')
      return
    }

    const telefoneNumeros = telefone.replace(/\D/g, '')
    if (telefoneNumeros.length < 10) {
      setErro('Telefone inválido. Informe com DDD.')
      return
    }

    setEnviando(true)
    setErro(null)

    try {
      await onSubmit({
        nome: nome.trim(),
        email: email.trim().toLowerCase(),
        telefone: telefoneNumeros,
        motivo: motivo.trim() || undefined
      })
      setSucesso(true)
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro ao enviar solicitação')
    } finally {
      setEnviando(false)
    }
  }

  if (sucesso) {
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
            <h1>Solicitação Enviada!</h1>
            <p>Sua solicitação de cadastro foi enviada com sucesso.</p>
          </header>

          <div className="login-success" style={{ marginBottom: '1rem' }}>
            Um administrador irá analisar sua solicitação. Você será notificado quando for aprovada.
          </div>

          <button 
            type="button" 
            className="button primary" 
            onClick={onVoltar}
            style={{ width: '100%', padding: '0.875rem' }}
          >
            Voltar para o login
          </button>
        </div>
      </div>
    )
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
          <h1>Solicitar Cadastro</h1>
          <p>Preencha seus dados para solicitar acesso ao sistema</p>
        </header>

        <form className="login-form" onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="nome">Nome completo *</label>
            <input
              id="nome"
              type="text"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Seu nome completo"
              required
            />
          </div>

          <div className="field">
            <label htmlFor="email">E-mail *</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              required
            />
          </div>

          <div className="field">
            <label htmlFor="telefone">Telefone (com DDD) *</label>
            <input
              id="telefone"
              type="tel"
              value={telefone}
              onChange={(e) => setTelefone(e.target.value)}
              placeholder="(00) 00000-0000"
              required
            />
          </div>

          <div className="field">
            <label htmlFor="motivo">Motivo da solicitação (opcional)</label>
            <textarea
              id="motivo"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Descreva brevemente por que precisa de acesso"
              rows={3}
            />
          </div>

          {erro && <p className="login-error">{erro}</p>}

          <button 
            type="submit" 
            className="button primary" 
            disabled={enviando} 
            style={{ width: '100%', padding: '0.875rem' }}
          >
            {enviando ? 'Enviando...' : 'Enviar solicitação'}
          </button>

          <button 
            type="button" 
            className="button ghost" 
            onClick={onVoltar}
            style={{ width: '100%', marginTop: '0.5rem' }}
          >
            Voltar para o login
          </button>
        </form>
      </div>
    </div>
  )
}
