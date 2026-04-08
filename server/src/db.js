import { createClient } from '@libsql/client'
import postgres from 'postgres'
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

const SQLITE_DDL = [
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

/** Exportado para o script de importação JSON. */
export const POSTGRES_DDL = [
  `CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    login TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
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
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    criado_em TEXT NOT NULL,
    atualizado_em TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS tarefas (
    id TEXT PRIMARY KEY,
    titulo TEXT NOT NULL,
    produto TEXT NOT NULL,
    status TEXT NOT NULL,
    prioridade TEXT NOT NULL,
    tempo_trabalhado_horas DOUBLE PRECISION,
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

/** Colunas na ordem do INSERT em massa de tarefas (import JSON). */
const TAREFAS_IMPORT_COLS = [
  'id',
  'titulo',
  'produto',
  'status',
  'prioridade',
  'tempo_trabalhado_horas',
  'observacoes',
  'data',
  'atribuido_ids',
  'criado_por_id',
  'parent_id',
  'cronometro_segundos_acumulados',
  'cronometro_inicio_em',
  'criada_em',
  'atualizada_em'
]

const SQLITE_TAREFAS_UPSERT_SET = `titulo = excluded.titulo,
    produto = excluded.produto,
    status = excluded.status,
    prioridade = excluded.prioridade,
    tempo_trabalhado_horas = excluded.tempo_trabalhado_horas,
    observacoes = excluded.observacoes,
    data = excluded.data,
    atribuido_ids = excluded.atribuido_ids,
    criado_por_id = excluded.criado_por_id,
    parent_id = excluded.parent_id,
    cronometro_segundos_acumulados = excluded.cronometro_segundos_acumulados,
    cronometro_inicio_em = excluded.cronometro_inicio_em,
    criada_em = excluded.criada_em,
    atualizada_em = excluded.atualizada_em`

function placeholdersToPg(sql) {
  let n = 0
  return sql.replace(/\?/g, () => `$${++n}`)
}

async function initSqliteSchema(client) {
  try {
    await client.execute('PRAGMA journal_mode = WAL')
  } catch {
    /* ignore */
  }
  for (const statement of SQLITE_DDL) {
    await client.execute(statement)
  }
}

async function initPostgresSchema(sql) {
  for (const statement of POSTGRES_DDL) {
    await sql.unsafe(statement)
  }
}

function wrapPostgres(pg) {
  return {
    isPostgres: true,
    async get(q, args = []) {
      const text = placeholdersToPg(q)
      const rows = await pg.unsafe(text, args)
      const row = rows[0]
      return row ? normalizeRow(row) : undefined
    },
    async all(q, args = []) {
      const text = placeholdersToPg(q)
      const rows = await pg.unsafe(text, args)
      const list = Array.isArray(rows) ? rows : []
      return list.map(normalizeRow)
    },
    async run(q, args = []) {
      const text = placeholdersToPg(q)
      const result = await pg.unsafe(text, args)
      return { changes: Number(result.count ?? 0) }
    },
    /**
     * Importação em lote: poucas idas à base (evita timeout em serverless com milhares de tarefas).
     */
    async bulkUpsertTarefasImport(rows) {
      if (!rows.length) return
      const CHUNK = 200
      for (let i = 0; i < rows.length; i += CHUNK) {
        const chunk = rows.slice(i, i + CHUNK)
        const objs = chunk.map((r) => {
          const o = {}
          for (const c of TAREFAS_IMPORT_COLS) {
            o[c] = r[c]
          }
          return o
        })
        await pg`
          INSERT INTO tarefas ${pg(objs, ...TAREFAS_IMPORT_COLS)}
          ON CONFLICT (id) DO UPDATE SET
            titulo = EXCLUDED.titulo,
            produto = EXCLUDED.produto,
            status = EXCLUDED.status,
            prioridade = EXCLUDED.prioridade,
            tempo_trabalhado_horas = EXCLUDED.tempo_trabalhado_horas,
            observacoes = EXCLUDED.observacoes,
            data = EXCLUDED.data,
            atribuido_ids = EXCLUDED.atribuido_ids,
            criado_por_id = EXCLUDED.criado_por_id,
            parent_id = EXCLUDED.parent_id,
            cronometro_segundos_acumulados = EXCLUDED.cronometro_segundos_acumulados,
            cronometro_inicio_em = EXCLUDED.cronometro_inicio_em,
            criada_em = EXCLUDED.criada_em,
            atualizada_em = EXCLUDED.atualizada_em
        `
      }
    }
  }
}

/**
 * Produção (Vercel): PostgreSQL — defina DATABASE_URL (Neon, Vercel Postgres, Supabase, etc.).
 * Local sem DATABASE_URL: SQLite em arquivo (padrão server/database.sqlite) via LibSQL.
 */
export async function createDatabase() {
  const databaseUrl = process.env.DATABASE_URL?.trim()

  if (process.env.VERCEL && !databaseUrl) {
    throw new Error(
      'Configure DATABASE_URL nas variáveis de ambiente do projeto na Vercel (PostgreSQL; ex.: Neon ou Storage da Vercel). SQLite em ficheiro não é suportado em serverless.'
    )
  }

  if (databaseUrl) {
    const sql = postgres(databaseUrl, {
      max: Number(process.env.PG_POOL_MAX || 5),
      // URLs "pooled" (Neon, Supabase transaction pooler, Vercel Postgres) usam PgBouncer em modo
      // transaction: prepared statements não são fiáveis entre ligações → 500 intermitentes.
      prepare: process.env.PG_PREPARE === 'true'
    })
    await initPostgresSchema(sql)
    return wrapPostgres(sql)
  }

  const path = process.env.DATABASE_PATH || join(__dirname, '..', 'database.sqlite')
  const dir = dirname(path)
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  const client = createClient({ url: pathToFileURL(path).href })
  await initSqliteSchema(client)

  const colsSql = TAREFAS_IMPORT_COLS.join(', ')
  const oneRowPh = '(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)'

  return {
    isPostgres: false,
    async get(q, args = []) {
      const r = await client.execute({ sql: q, args })
      return r.rows[0] ? normalizeRow(r.rows[0]) : undefined
    },
    async all(q, args = []) {
      const r = await client.execute({ sql: q, args })
      return r.rows.map(normalizeRow)
    },
    async run(q, args = []) {
      const r = await client.execute({ sql: q, args })
      return { changes: Number(r.rowsAffected ?? 0) }
    },
    async bulkUpsertTarefasImport(rows) {
      if (!rows.length) return
      const CHUNK = 60
      for (let i = 0; i < rows.length; i += CHUNK) {
        const chunk = rows.slice(i, i + CHUNK)
        const placeholders = chunk.map(() => oneRowPh).join(',')
        const args = chunk.flatMap((r) =>
          TAREFAS_IMPORT_COLS.map((c) => r[c])
        )
        await client.execute({
          sql: `INSERT INTO tarefas (${colsSql}) VALUES ${placeholders}
            ON CONFLICT (id) DO UPDATE SET ${SQLITE_TAREFAS_UPSERT_SET}`,
          args
        })
      }
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
