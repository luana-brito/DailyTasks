import { getApiUrl, AUTH_TOKEN_KEY } from '../config'
import type { Tarefa, Usuario, Produto, SolicitacaoCadastro } from '../types'

function getToken(): string | null {
  return localStorage.getItem(AUTH_TOKEN_KEY)
}

async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    ...(init.headers as Record<string, string> | undefined),
    Accept: 'application/json'
  }
  const token = getToken()
  if (token) headers.Authorization = `Bearer ${token}`
  if (init.body != null && typeof init.body === 'string' && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json'
  }

  const base = getApiUrl()
  const res = await fetch(`${base}${path}`, { ...init, headers })
  if (res.status === 204) return undefined as T

  const text = await res.text()
  let data: unknown = null
  if (text) {
    try {
      data = JSON.parse(text)
    } catch {
      data = { error: text }
    }
  }

  if (!res.ok) {
    const msg =
      data && typeof data === 'object' && data !== null && 'error' in data
        ? String((data as { error: string }).error)
        : `Erro HTTP ${res.status}`
    throw new Error(msg)
  }

  return data as T
}

export function setAuthToken(token: string | null) {
  if (token) localStorage.setItem(AUTH_TOKEN_KEY, token)
  else localStorage.removeItem(AUTH_TOKEN_KEY)
}

// --- Auth -------------------------------------------------------------------

export type LoginResponse = { token: string; user: Usuario }

export async function loginApi(email: string, password: string): Promise<LoginResponse> {
  return apiFetch<LoginResponse>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: email.trim().toLowerCase(), password })
  })
}

export async function meApi(): Promise<Usuario> {
  return apiFetch<Usuario>('/api/auth/me')
}

// --- Usuários ---------------------------------------------------------------

export type CriarUsuarioPayload = Omit<Usuario, 'id' | 'criadoEm' | 'atualizadoEm'> & {
  email: string
  password: string
}

export async function criarUsuarioApi(payload: CriarUsuarioPayload): Promise<Usuario> {
  return apiFetch<Usuario>('/api/usuarios', {
    method: 'POST',
    body: JSON.stringify({
      email: payload.email,
      password: payload.password,
      login: payload.login || payload.email,
      nome: payload.nome,
      telefone: payload.telefone,
      status: payload.status,
      role: payload.role
    })
  })
}

export type AtualizarUsuarioPayload = Partial<
  Omit<Usuario, 'id' | 'criadoEm' | 'atualizadoEm'>
> & {
  password?: string
  currentPassword?: string
}

export async function atualizarUsuarioApi(id: string, payload: AtualizarUsuarioPayload): Promise<Usuario> {
  return apiFetch<Usuario>(`/api/usuarios/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(payload)
  })
}

export async function removerUsuarioApi(id: string): Promise<void> {
  await apiFetch(`/api/usuarios/${encodeURIComponent(id)}`, { method: 'DELETE' })
}

/** Backup gerado por GET /api/usuarios/export (contém password_hash — trate como confidencial). */
export type UsuariosBackupPayload = {
  app: string
  version: number
  exportedAt: string
  users: Array<{
    id: string
    login: string
    email: string
    password_hash: string
    nome: string
    telefone: string
    status: string
    role: string
    criado_em: string
    atualizado_em: string
  }>
}

export async function exportUsuariosBackupApi(): Promise<UsuariosBackupPayload> {
  return apiFetch<UsuariosBackupPayload>('/api/usuarios/export')
}

export async function importUsuariosBackupApi(
  payload: UsuariosBackupPayload | { users: UsuariosBackupPayload['users'] }
): Promise<{ ok: boolean; imported: number }> {
  return apiFetch<{ ok: boolean; imported: number }>('/api/usuarios/import', {
    method: 'POST',
    body: JSON.stringify(payload)
  })
}

// --- Tarefas ----------------------------------------------------------------

export type CriarTarefaPayload = Omit<Tarefa, 'id' | 'criadaEm' | 'atualizadaEm'>

export async function criarTarefaApi(payload: CriarTarefaPayload): Promise<Tarefa> {
  return apiFetch<Tarefa>('/api/tarefas', {
    method: 'POST',
    body: JSON.stringify(payload)
  })
}

export type AtualizarTarefaPayload = Partial<Omit<Tarefa, 'id' | 'criadaEm' | 'atualizadaEm'>>

export type OpcoesAtualizarTarefa = {
  removerCronometroInicio?: boolean
  removerTempoTrabalhado?: boolean
}

export async function atualizarTarefaApi(
  id: string,
  payload: AtualizarTarefaPayload,
  opcoes?: OpcoesAtualizarTarefa
): Promise<Tarefa> {
  const body = {
    ...payload,
    removeCronometroInicio: opcoes?.removerCronometroInicio,
    removeTempoTrabalhado: opcoes?.removerTempoTrabalhado
  }
  return apiFetch<Tarefa>(`/api/tarefas/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(body)
  })
}

export async function removerTarefaApi(id: string): Promise<void> {
  await apiFetch(`/api/tarefas/${encodeURIComponent(id)}`, { method: 'DELETE' })
}

export type TarefasBackupPayload = {
  app: string
  version: number
  exportedAt: string
  tarefas: Array<{
    id: string
    titulo: string
    produto: string
    status: string
    prioridade: string
    tempo_trabalhado_horas: number | null
    observacoes: string | null
    data: string
    atribuido_ids: string
    criado_por_id: string
    parent_id: string | null
    cronometro_segundos_acumulados: number | null
    cronometro_inicio_em: string | null
    criada_em: string
    atualizada_em: string
  }>
}

export async function exportTarefasBackupApi(): Promise<TarefasBackupPayload> {
  return apiFetch<TarefasBackupPayload>('/api/tarefas/export')
}

export async function importTarefasBackupApi(
  payload: TarefasBackupPayload | { tarefas: TarefasBackupPayload['tarefas'] }
): Promise<{ ok: boolean; imported: number }> {
  return apiFetch<{ ok: boolean; imported: number }>('/api/tarefas/import', {
    method: 'POST',
    body: JSON.stringify(payload)
  })
}

// --- Produtos ---------------------------------------------------------------

export type CriarProdutoPayload = Omit<Produto, 'id' | 'criadoEm' | 'atualizadoEm'>

export async function criarProdutoApi(payload: CriarProdutoPayload): Promise<Produto> {
  return apiFetch<Produto>('/api/produtos', {
    method: 'POST',
    body: JSON.stringify(payload)
  })
}

export type AtualizarProdutoPayload = Partial<Omit<Produto, 'id' | 'criadoEm' | 'atualizadoEm'>>

export async function atualizarProdutoApi(id: string, payload: AtualizarProdutoPayload): Promise<Produto> {
  return apiFetch<Produto>(`/api/produtos/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(payload)
  })
}

export async function removerProdutoApi(id: string): Promise<void> {
  await apiFetch(`/api/produtos/${encodeURIComponent(id)}`, { method: 'DELETE' })
}

export type ProdutosBackupPayload = {
  app: string
  version: number
  exportedAt: string
  produtos: Array<{
    id: string
    nome: string
    executiva: string | null
    ativo: number
    criado_em: string
    atualizado_em: string
  }>
}

export async function exportProdutosBackupApi(): Promise<ProdutosBackupPayload> {
  return apiFetch<ProdutosBackupPayload>('/api/produtos/export')
}

export async function importProdutosBackupApi(
  payload: ProdutosBackupPayload | { produtos: ProdutosBackupPayload['produtos'] }
): Promise<{ ok: boolean; imported: number }> {
  return apiFetch<{ ok: boolean; imported: number }>('/api/produtos/import', {
    method: 'POST',
    body: JSON.stringify(payload)
  })
}

// --- Solicitações -----------------------------------------------------------

export type CriarSolicitacaoPayload = Omit<SolicitacaoCadastro, 'id' | 'status' | 'criadoEm' | 'atualizadoEm'>

export async function criarSolicitacaoApi(payload: CriarSolicitacaoPayload): Promise<SolicitacaoCadastro> {
  const token = getToken()
  const base = getApiUrl()
  const headers: Record<string, string> = { 'Content-Type': 'application/json', Accept: 'application/json' }
  if (token) headers.Authorization = `Bearer ${token}`
  const res = await fetch(`${base}/api/solicitacoes`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload)
  })
  const text = await res.text()
  const data = text ? JSON.parse(text) : null
  if (!res.ok) throw new Error(data?.error || `Erro HTTP ${res.status}`)
  return data as SolicitacaoCadastro
}

export async function atualizarSolicitacaoApi(
  id: string,
  status: SolicitacaoCadastro['status']
): Promise<SolicitacaoCadastro> {
  return apiFetch<SolicitacaoCadastro>(`/api/solicitacoes/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify({ status })
  })
}

export async function fetchUsuarios(): Promise<Usuario[]> {
  return apiFetch<Usuario[]>('/api/usuarios')
}

export async function fetchTarefas(): Promise<Tarefa[]> {
  return apiFetch<Tarefa[]>('/api/tarefas')
}

export async function fetchProdutos(): Promise<Produto[]> {
  return apiFetch<Produto[]>('/api/produtos')
}

export async function fetchSolicitacoesPendentes(): Promise<SolicitacaoCadastro[]> {
  return apiFetch<SolicitacaoCadastro[]>('/api/solicitacoes?status=PENDENTE')
}
