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
import { auth, db, firebaseInitError } from '../services/firebase'
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
    const firebaseAuth = auth
    const firestore = db

    if (!firebaseAuth || !firestore) {
      setState({
        firebaseUser: null,
        usuario: null,
        loading: false,
        error: firebaseInitError ?? 'Firebase indisponível.'
      })
      return
    }

    const unsubscribe = onAuthStateChanged(firebaseAuth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const userDoc = await getDoc(doc(firestore, 'usuarios', firebaseUser.uid))
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
              await signOut(firebaseAuth)
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
            await signOut(firebaseAuth)
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
    if (!auth) {
      const msg = firebaseInitError ?? 'Firebase não configurado.'
      setState((prev) => ({ ...prev, loading: false, error: msg }))
      throw new Error(msg)
    }

    setState((prev) => ({ ...prev, loading: true, error: null }))
    
    try {
      await signInWithEmailAndPassword(auth, email, senha)
    } catch (err: unknown) {
      const errorMessage = getAuthErrorMessage(err)
      setState((prev) => ({ ...prev, loading: false, error: errorMessage }))
      throw new Error(errorMessage)
    }
  }

  const logout = async () => {
    if (!auth) return
    await signOut(auth)
    setState({
      firebaseUser: null,
      usuario: null,
      loading: false,
      error: null
    })
  }

  const criarUsuarioAuth = async (email: string, senha: string): Promise<string> => {
    if (!auth) throw new Error(firebaseInitError ?? 'Firebase não configurado.')
    const userCredential = await createUserWithEmailAndPassword(auth, email, senha)
    return userCredential.user.uid
  }

  const alterarSenha = async (senhaAtual: string, novaSenha: string) => {
    if (!auth) throw new Error(firebaseInitError ?? 'Firebase não configurado.')
    const user = auth.currentUser
    if (!user || !user.email) {
      throw new Error('Usuário não autenticado')
    }

    const credential = EmailAuthProvider.credential(user.email, senhaAtual)
    await reauthenticateWithCredential(user, credential)
    await updatePassword(user, novaSenha)
  }

  const recuperarSenha = async (email: string) => {
    if (!auth) throw new Error(firebaseInitError ?? 'Firebase não configurado.')
    try {
      console.log('Enviando email de recuperação para:', email)
      await sendPasswordResetEmail(auth, email)
      console.log('Email de recuperação enviado com sucesso')
    } catch (err: unknown) {
      console.error('Erro ao enviar email de recuperação:', err)
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
