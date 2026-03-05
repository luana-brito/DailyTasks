export type Produto = 'SISGRADE' | 'SIVOPE' | 'CIEVS' | 'GESTÃO'

export type Status = 'NOVO' | 'EM ANDAMENTO' | 'PAUSADO' | 'CONCLUIDO'

export type UsuarioStatus = 'ATIVO' | 'INATIVO'
export type UsuarioRole = 'ADMIN' | 'USUARIO'

export interface Tarefa {
  id: string
  titulo: string
  produto: Produto
  status: Status
  tempoTrabalhadoHoras?: number
  observacoes?: string
  data: string
  atribuidoIds: string[]
  criadaEm: string
  atualizadaEm: string
}

export interface Filtros {
  produto: Produto | 'TODOS'
  status: Status | 'TODOS'
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


