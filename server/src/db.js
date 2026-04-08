import { createClient } from '@libsql/client'
import { dirname, join } from 'path'
import { fileURLToPath, pathToFileURL } from 'url'
import { mkdirSync, existsSync } from 'fs'

const __dirname = dirname(fileURLToPath(import.meta.url))

function normalizeRow(row) {
  if (!row) return row
  const o = {}
  for (const [k, v] of Object.entries(row)) {
    o[k] = typeof v === 'bigint' ? Number(v) : v
  }
  return o
}

const DDL = [
  `CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    login TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE COLLATE NOCASE,
    password_hash TEXT NOT NULL,
    nome TEXT NOT NULL,
    telefone TEXT NOT NULL,
    status TEXT NOT NULL,
    role TEXT NOT NULL,
    criado_em TEXT NOT NULL,
    atualizado_em TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS produtos (
    id TEXT PRIMARY KEY,
    nome TEXT NOT NULL,
    executiva TEXT,
    ativo INTEGER NOT NULL DEFAULT 1,
    criado_em TEXT NOT NULL,
    atualizado_em TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS tarefas (
    id TEXT PRIMARY KEY,
    titulo TEXT NOT NULL,
    produto TEXT NOT NULL,
    status TEXT NOT NULL,
    prioridade TEXT NOT NULL,
    tempo_trabalhado_horas REAL,
    observacoes TEXT,
    data TEXT NOT NULL,
    atribuido_ids TEXT NOT NULL,
    criado_por_id TEXT NOT NULL,
    parent_id TEXT,
    cronometro_segundos_acumulados INTEGER,
    cronometro_inicio_em TEXT,
    criada_em TEXT NOT NULL,
    atualizada_em TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS solicitacoes_cadastro (
    id TEXT PRIMARY KEY,
    nome TEXT NOT NULL,
    email TEXT NOT NULL,
    telefone TEXT NOT NULL,
    motivo TEXT,
    status TEXT NOT NULL,
    criado_em TEXT NOT NULL,
    atualizado_em TEXT NOT NULL
  )`
]

async function initSchema(client, isRemote) {
  if (!isRemote) {
    try {
      await client.execute('PRAGMA journal_mode = WAL')
    } catch {
      /* ignore */
    }
  }
  for (const sql of DDL) {
    await client.execute(sql)
  }
}

/**
 * Local: arquivo SQLite (padrão server/database.sqlite).
 * Produção (Vercel): Turso — defina TURSO_DATABASE_URL e TURSO_AUTH_TOKEN.
 */
export async function createDatabase() {
  const tursoUrl = process.env.TURSO_DATABASE_URL?.trim()
  const authToken = process.env.TURSO_AUTH_TOKEN?.trim()

  let client
  let isRemote = Boolean(tursoUrl)
  if (tursoUrl) {
    client = createClient({ url: tursoUrl, authToken: authToken || undefined })
  } else {
    const path = process.env.DATABASE_PATH || join(__dirname, '..', 'database.sqlite')
    const dir = dirname(path)
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
    client = createClient({ url: pathToFileURL(path).href })
  }

  await initSchema(client, isRemote)

  return {
    async get(sql, args = []) {
      const r = await client.execute({ sql, args })
      return r.rows[0] ? normalizeRow(r.rows[0]) : undefined
    },
    async all(sql, args = []) {
      const r = await client.execute({ sql, args })
      return r.rows.map(normalizeRow)
    },
    async run(sql, args = []) {
      const r = await client.execute({ sql, args })
      return { changes: Number(r.rowsAffected ?? 0) }
    }
  }
}

export function rowToUsuario(row) {
  if (!row) return null
  return {
    id: row.id,
    login: row.login,
    nome: row.nome,
    email: row.email,
    telefone: row.telefone,
    status: row.status,
    role: row.role,
    criadoEm: row.criado_em,
    atualizadoEm: row.atualizado_em
  }
}

export function rowToProduto(row) {
  if (!row) return null
  return {
    id: row.id,
    nome: row.nome,
    executiva: row.executiva || undefined,
    ativo: Boolean(row.ativo),
    criadoEm: row.criado_em,
    atualizadoEm: row.atualizado_em
  }
}

export function rowToTarefa(row) {
  if (!row) return null
  let atribuidoIds = []
  try {
    atribuidoIds = JSON.parse(row.atribuido_ids || '[]')
  } catch {
    atribuidoIds = []
  }
  const t = {
    id: row.id,
    titulo: row.titulo,
    produto: row.produto,
    status: row.status,
    prioridade: row.prioridade,
    data: row.data,
    atribuidoIds,
    criadoPorId: row.criado_por_id,
    criadaEm: row.criada_em,
    atualizadaEm: row.atualizada_em
  }
  if (row.tempo_trabalhado_horas != null) t.tempoTrabalhadoHoras = row.tempo_trabalhado_horas
  if (row.observacoes != null) t.observacoes = row.observacoes
  if (row.parent_id) t.parentId = row.parent_id
  if (row.cronometro_segundos_acumulados != null)
    t.cronometroSegundosAcumulados = row.cronometro_segundos_acumulados
  if (row.cronometro_inicio_em) t.cronometroInicioEm = row.cronometro_inicio_em
  return t
}

export function rowToSolicitacao(row) {
  if (!row) return null
  return {
    id: row.id,
    nome: row.nome,
    email: row.email,
    telefone: row.telefone,
    motivo: row.motivo || undefined,
    status: row.status,
    criadoEm: row.criado_em,
    atualizadoEm: row.atualizado_em
  }
}
