export type Status = 'NOVO' | 'EM ANDAMENTO' | 'PAUSADO' | 'CONCLUIDO'

export type UsuarioStatus = 'ATIVO' | 'INATIVO'
export type UsuarioRole = 'ADMIN' | 'USUARIO'

export type SolicitacaoStatus = 'PENDENTE' | 'APROVADO' | 'RECUSADO'

export type Executiva = 'SEVSAP' | 'SEGTES' | 'GSAS'

export type Prioridade = 'ALTA' | 'MEDIA' | 'BAIXA'

export interface Produto {
  id: string
  nome: string
  executiva?: Executiva
  ativo: boolean
  criadoEm: string
  atualizadoEm: string
}

export interface Tarefa {
  id: string
  titulo: string
  produto: string
  status: Status
  prioridade: Prioridade
  tempoTrabalhadoHoras?: number
  observacoes?: string
  data: string
  atribuidoIds: string[]
  criadoPorId: string
  /** ID da tarefa mãe, quando esta é uma subtarefa */
  parentId?: string
  /** Segundos já contados em períodos em "Em andamento" (sessão pausada) */
  cronometroSegundosAcumulados?: number
  /** ISO — início da sessão atual em "Em andamento" (cronômetro ativo) */
  cronometroInicioEm?: string
  criadaEm: string
  atualizadaEm: string
}

export interface Filtros {
  produto: string | 'TODOS'
  status: Status | 'TODOS'
  /** YYYY-MM-DD; string vazio = não filtrar tabela/kanban por data */
  data: string
  atribuicoes: 'TODOS' | 'EU' | string[]
}

export interface Usuario {
  id: string
  login: string
  nome: string
  email: string
  telefone: string
  status: UsuarioStatus
  role: UsuarioRole
  criadoEm: string
  atualizadoEm: string
}

export interface SolicitacaoCadastro {
  id: string
  nome: string
  email: string
  telefone: string
  motivo?: string
  status: SolicitacaoStatus
  criadoEm: string
  atualizadoEm: string
}

/** Limite de caracteres do título (tarefa e subtarefa). */
export const LIMITE_CARACTERES_TITULO_TAREFA = 100

export function truncarTituloTarefa(titulo: string): string {
  return titulo.trim().slice(0, LIMITE_CARACTERES_TITULO_TAREFA)
}
