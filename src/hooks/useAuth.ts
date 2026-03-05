import { useEffect, useState } from 'react'
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  createUserWithEmailAndPassword,
  updatePassword,
  EmailAuthProvider,
  reauthenticateWithCredential,
  sendPasswordResetEmail,
  type User
} from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { auth, db } from '../services/firebase'
import type { Usuario } from '../types'

interface AuthState {
  firebaseUser: User | null
  usuario: Usuario | null
  loading: boolean
  error: string | null
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    firebaseUser: null,
    usuario: null,
    loading: true,
    error: null
  })

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const userDoc = await getDoc(doc(db, 'usuarios', firebaseUser.uid))
          if (userDoc.exists()) {
            const userData = userDoc.data()
            const usuario: Usuario = {
              id: firebaseUser.uid,
              login: userData.login ?? firebaseUser.email ?? '',
              nome: userData.nome ?? '',
              email: firebaseUser.email ?? '',
              telefone: userData.telefone ?? '',
              status: userData.status ?? 'ATIVO',
              role: userData.role ?? 'USUARIO',
              criadoEm: userData.criadoEm?.toDate?.()?.toISOString() ?? new Date().toISOString(),
              atualizadoEm: userData.atualizadoEm?.toDate?.()?.toISOString() ?? new Date().toISOString()
            }

            if (usuario.status !== 'ATIVO') {
              await signOut(auth)
              setState({
                firebaseUser: null,
                usuario: null,
                loading: false,
                error: 'Usuário inativo. Contate o administrador.'
              })
              return
            }

            setState({
              firebaseUser,
              usuario,
              loading: false,
              error: null
            })
          } else {
            await signOut(auth)
            setState({
              firebaseUser: null,
              usuario: null,
              loading: false,
              error: 'Usuário não encontrado no sistema.'
            })
          }
        } catch (err) {
          console.error('Erro ao carregar dados do usuário:', err)
          setState({
            firebaseUser,
            usuario: null,
            loading: false,
            error: 'Erro ao carregar dados do usuário.'
          })
        }
      } else {
        setState({
          firebaseUser: null,
          usuario: null,
          loading: false,
          error: null
        })
      }
    })

    return () => unsubscribe()
  }, [])

  const login = async (email: string, senha: string) => {
    setState((prev) => ({ ...prev, loading: true, error: null }))
    
    if (!email.toLowerCase().endsWith('@saude.pe.gov.br')) {
      const errorMessage = 'Apenas e-mails @saude.pe.gov.br são permitidos.'
      setState((prev) => ({ ...prev, loading: false, error: errorMessage }))
      throw new Error(errorMessage)
    }
    
    try {
      await signInWithEmailAndPassword(auth, email, senha)
    } catch (err: unknown) {
      const errorMessage = getAuthErrorMessage(err)
      setState((prev) => ({ ...prev, loading: false, error: errorMessage }))
      throw new Error(errorMessage)
    }
  }

  const logout = async () => {
    await signOut(auth)
    setState({
      firebaseUser: null,
      usuario: null,
      loading: false,
      error: null
    })
  }

  const criarUsuarioAuth = async (email: string, senha: string): Promise<string> => {
    const userCredential = await createUserWithEmailAndPassword(auth, email, senha)
    return userCredential.user.uid
  }

  const alterarSenha = async (senhaAtual: string, novaSenha: string) => {
    const user = auth.currentUser
    if (!user || !user.email) {
      throw new Error('Usuário não autenticado')
    }

    const credential = EmailAuthProvider.credential(user.email, senhaAtual)
    await reauthenticateWithCredential(user, credential)
    await updatePassword(user, novaSenha)
  }

  const recuperarSenha = async (email: string) => {
    if (!email.toLowerCase().endsWith('@saude.pe.gov.br')) {
      throw new Error('Apenas e-mails @saude.pe.gov.br são permitidos.')
    }
    
    try {
      await sendPasswordResetEmail(auth, email)
    } catch (err: unknown) {
      const errorMessage = getAuthErrorMessage(err)
      throw new Error(errorMessage)
    }
  }

  return {
    ...state,
    login,
    logout,
    criarUsuarioAuth,
    alterarSenha,
    recuperarSenha
  }
}

function getAuthErrorMessage(err: unknown): string {
  if (err && typeof err === 'object' && 'code' in err) {
    const code = (err as { code: string }).code
    switch (code) {
      case 'auth/invalid-email':
        return 'E-mail inválido.'
      case 'auth/user-disabled':
        return 'Usuário desativado.'
      case 'auth/user-not-found':
        return 'Usuário não encontrado.'
      case 'auth/wrong-password':
        return 'Senha incorreta.'
      case 'auth/invalid-credential':
        return 'E-mail ou senha incorretos.'
      case 'auth/email-already-in-use':
        return 'Este e-mail já está em uso.'
      case 'auth/weak-password':
        return 'A senha deve ter pelo menos 6 caracteres.'
      case 'auth/too-many-requests':
        return 'Muitas tentativas. Aguarde alguns minutos.'
      default:
        return 'Erro de autenticação.'
    }
  }
  return 'Erro de autenticação.'
}
