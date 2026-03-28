import { StrictMode, Component, type ErrorInfo, type ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { registerSW } from 'virtual:pwa-register'

registerSW({
  immediate: true
})

class RaizErrorBoundary extends Component<{ children: ReactNode }, { mensagem: string | null }> {
  state = { mensagem: null as string | null }

  static getDerivedStateFromError(err: Error) {
    return { mensagem: err.message || 'Erro inesperado ao carregar a aplicação.' }
  }

  componentDidCatch(err: Error, info: ErrorInfo) {
    console.error(err, info.componentStack)
  }

  render() {
    if (this.state.mensagem) {
      return (
        <div className="loading-screen" style={{ padding: '2rem' }}>
          <div className="loading-card">
            <p style={{ marginBottom: '1rem' }}>{this.state.mensagem}</p>
            <p style={{ fontSize: '0.875rem', opacity: 0.85, marginBottom: '1rem' }}>
              Abra o console do navegador (F12) para mais detalhes. Se faltar configuração do Firebase,
              copie <code>.env.example</code> para <code>.env</code> na pasta do projeto.
            </p>
            <button className="button primary" type="button" onClick={() => window.location.reload()}>
              Recarregar
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RaizErrorBoundary>
      <div className="app-wrapper">
        <App />
      </div>
    </RaizErrorBoundary>
  </StrictMode>,
)
