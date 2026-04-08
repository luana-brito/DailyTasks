import { useEffect, useState, useCallback } from 'react'
import { meApi, loginApi, setAuthToken, atualizarUsuarioApi } from '../services/api'
import type { Usuario } from '../types'

interface AuthState {
  usuario: Usuario | null
  loading: boolean
  error: string | null
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    usuario: null,
    loading: true,
    error: null
  })

  useEffect(() => {
    let cancel = false

    async function init() {
      const token = localStorage.getItem('dailytasks_token')
      if (!token) {
        setState({ usuario: null, loading: false, error: null })
        return
      }

      try {
        const usuario = await meApi()
        if (!cancel) setState({ usuario, loading: false, error: null })
      } catch {
        setAuthToken(null)
        if (!cancel) {
          setState({
            usuario: null,
            loading: false,
            error: null
          })
        }
      }
    }

    init()
    return () => {
      cancel = true
    }
  }, [])

  const login = useCallback(async (email: string, senha: string) => {
    setState((prev) => ({ ...prev, loading: true, error: null }))
    try {
      const { token, user } = await loginApi(email, senha)
      setAuthToken(token)
      setState({ usuario: user, loading: false, error: null })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Não foi possível realizar o login.'
      setState((prev) => ({ ...prev, loading: false, error: msg }))
      throw new Error(msg)
    }
  }, [])

  const logout = useCallback(async () => {
    setAuthToken(null)
    setState({ usuario: null, loading: false, error: null })
  }, [])

  const refreshUsuario = useCallback(async () => {
    if (!localStorage.getItem('dailytasks_token')) return
    try {
      const usuario = await meApi()
      setState((prev) => ({ ...prev, usuario }))
    } catch {
      setAuthToken(null)
      setState({ usuario: null, loading: false, error: null })
    }
  }, [])

  const alterarSenha = useCallback(async (senhaAtual: string, novaSenha: string) => {
    const u = state.usuario
    if (!u) throw new Error('Usuário não autenticado.')
    await atualizarUsuarioApi(u.id, {
      currentPassword: senhaAtual,
      password: novaSenha
    })
  }, [state.usuario])

  const recuperarSenha = useCallback(async (_email: string) => {
    throw new Error(
      'A recuperação automática por e-mail não está disponível com o banco local. Peça a um administrador para redefinir sua senha na gestão de usuários.'
    )
  }, [])

  return {
    usuario: state.usuario,
    loading: state.loading,
    error: state.error,
    login,
    logout,
    refreshUsuario,
    alterarSenha,
    recuperarSenha
  }
}
