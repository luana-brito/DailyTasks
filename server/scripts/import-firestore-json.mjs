/**
 * Importa um JSON de backup (mapas documentoId → campos) para SQLite local ou PostgreSQL.
 *
 * Uso (na pasta server):
 *   IMPORT_DEFAULT_PASSWORD=senhaTemporaria123 npm run import-firestore -- ../backup.json
 *
 * PostgreSQL: defina DATABASE_URL (mesmo da Vercel/Neon/etc.).
 * SQLite local: sem DATABASE_URL — usa server/database.sqlite.
 */

import 'dotenv/config'
import fs from 'fs'
import bcrypt from 'bcryptjs'
import { dirname, join } from 'path'
import { fileURLToPath, pathToFileURL } from 'url'
import { createClient } from '@libsql/client'
import postgres from 'postgres'
import { POSTGRES_DDL } from '../src/db.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

function parseTime(v) {
  if (v == null) return new Date().toISOString()
  if (typeof v === 'string') {
    const d = new Date(v)
    return Number.isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString()
  }
  const sec = v.seconds ?? v._seconds
  if (sec != null) return new Date(sec * 1000).toISOString()
  return new Date().toISOString()
}

const file = process.argv[2]
if (!file || !fs.existsSync(file)) {
  console.error('Uso: npm run import-firestore -- caminho/para/export.json')
  console.error('Arquivo não encontrado:', file)
  process.exit(1)
}

const defaultPass = process.env.IMPORT_DEFAULT_PASSWORD || 'alterar123'
const passwordHash = bcrypt.hashSync(defaultPass, 10)
console.log(`Senha inicial dos usuários importados: "${defaultPass}"`)
console.log('Defina IMPORT_DEFAULT_PASSWORD no ambiente para usar outra.\n')

const raw = JSON.parse(fs.readFileSync(file, 'utf8'))

const databaseUrl = process.env.DATABASE_URL?.trim()
const usePg = Boolean(databaseUrl)

const sqliteDdl = [
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

let pg
let sqliteClient

if (usePg) {
  pg = postgres(databaseUrl, { max: 5 })
  for (const statement of POSTGRES_DDL) {
    await pg.unsafe(statement)
  }
  console.log('Destino: PostgreSQL (DATABASE_URL)\n')
} else {
  const dbPath = process.env.DATABASE_PATH || join(__dirname, '..', 'database.sqlite')
  sqliteClient = createClient({ url: pathToFileURL(dbPath).href })
  for (const sql of sqliteDdl) {
    await sqliteClient.execute(sql)
  }
  console.log('Destino: SQLite local\n', dbPath, '\n')
}

let nu = 0,
  nt = 0,
  np = 0,
  ns = 0

const usuarios = raw.usuarios || {}
for (const [id, d] of Object.entries(usuarios)) {
  const email = String(d.email || d.login || '').trim().toLowerCase()
  if (!email) continue
  const row = [
    id,
    String(d.login || email).trim(),
    email,
    passwordHash,
    String(d.nome || '').trim() || email,
    String(d.telefone || '').replace(/\D/g, '') || '0000000000',
    d.status === 'INATIVO' ? 'INATIVO' : 'ATIVO',
    d.role === 'ADMIN' ? 'ADMIN' : 'USUARIO',
    parseTime(d.criadoEm),
    parseTime(d.atualizadoEm)
  ]
  if (usePg) {
    await pg.unsafe(
      `INSERT INTO users (id, login, email, password_hash, nome, telefone, status, role, criado_em, atualizado_em)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       ON CONFLICT (id) DO UPDATE SET
         login = EXCLUDED.login,
         email = EXCLUDED.email,
         password_hash = EXCLUDED.password_hash,
         nome = EXCLUDED.nome,
         telefone = EXCLUDED.telefone,
         status = EXCLUDED.status,
         role = EXCLUDED.role,
         criado_em = EXCLUDED.criado_em,
         atualizado_em = EXCLUDED.atualizado_em`,
      row
    )
  } else {
    await sqliteClient.execute({
      sql: `INSERT OR REPLACE INTO users (id, login, email, password_hash, nome, telefone, status, role, criado_em, atualizado_em)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: row
    })
  }
  nu++
}

const produtos = raw.produtos || {}
for (const [id, d] of Object.entries(produtos)) {
  const row = [
    id,
    String(d.nome || '').trim() || '—',
    d.executiva || null,
    d.ativo === false ? 0 : 1,
    parseTime(d.criadoEm),
    parseTime(d.atualizadoEm)
  ]
  if (usePg) {
    await pg.unsafe(
      `INSERT INTO produtos (id, nome, executiva, ativo, criado_em, atualizado_em)
       VALUES ($1,$2,$3,$4::boolean,$5,$6)
       ON CONFLICT (id) DO UPDATE SET
         nome = EXCLUDED.nome,
         executiva = EXCLUDED.executiva,
         ativo = EXCLUDED.ativo,
         criado_em = EXCLUDED.criado_em,
         atualizado_em = EXCLUDED.atualizado_em`,
      [row[0], row[1], row[2], row[3] === 1, row[4], row[5]]
    )
  } else {
    await sqliteClient.execute({
      sql: `INSERT OR REPLACE INTO produtos (id, nome, executiva, ativo, criado_em, atualizado_em)
            VALUES (?, ?, ?, ?, ?, ?)`,
      args: row
    })
  }
  np++
}

const tarefas = raw.tarefas || {}
for (const [id, d] of Object.entries(tarefas)) {
  const atribuidoIds = Array.isArray(d.atribuidoIds) ? d.atribuidoIds : []
  const row = [
    id,
    String(d.titulo || ''),
    String(d.produto || ''),
    String(d.status || 'NOVO'),
    String(d.prioridade || 'MEDIA'),
    d.tempoTrabalhadoHoras != null && !Number.isNaN(Number(d.tempoTrabalhadoHoras))
      ? Number(d.tempoTrabalhadoHoras)
      : null,
    d.observacoes != null ? String(d.observacoes) : null,
    String(d.data || new Date().toISOString().slice(0, 10)),
    JSON.stringify(atribuidoIds),
    String(d.criadoPorId || ''),
    d.parentId || null,
    d.cronometroSegundosAcumulados != null ? Number(d.cronometroSegundosAcumulados) : null,
    d.cronometroInicioEm || null,
    parseTime(d.criadaEm),
    parseTime(d.atualizadaEm)
  ]
  if (usePg) {
    await pg.unsafe(
      `INSERT INTO tarefas (
        id, titulo, produto, status, prioridade, tempo_trabalhado_horas, observacoes, data,
        atribuido_ids, criado_por_id, parent_id, cronometro_segundos_acumulados, cronometro_inicio_em,
        criada_em, atualizada_em
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
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
        atualizada_em = EXCLUDED.atualizada_em`,
      row
    )
  } else {
    await sqliteClient.execute({
      sql: `INSERT OR REPLACE INTO tarefas (
        id, titulo, produto, status, prioridade, tempo_trabalhado_horas, observacoes, data,
        atribuido_ids, criado_por_id, parent_id, cronometro_segundos_acumulados, cronometro_inicio_em,
        criada_em, atualizada_em
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: row
    })
  }
  nt++
}

const sol = raw.solicitacoes_cadastro || {}
for (const [id, d] of Object.entries(sol)) {
  const row = [
    id,
    String(d.nome || ''),
    String(d.email || '').trim().toLowerCase(),
    String(d.telefone || '').replace(/\D/g, ''),
    d.motivo != null ? String(d.motivo) : null,
    ['PENDENTE', 'APROVADO', 'RECUSADO'].includes(d.status) ? d.status : 'PENDENTE',
    parseTime(d.criadoEm),
    parseTime(d.atualizadoEm)
  ]
  if (usePg) {
    await pg.unsafe(
      `INSERT INTO solicitacoes_cadastro (id, nome, email, telefone, motivo, status, criado_em, atualizado_em)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       ON CONFLICT (id) DO UPDATE SET
         nome = EXCLUDED.nome,
         email = EXCLUDED.email,
         telefone = EXCLUDED.telefone,
         motivo = EXCLUDED.motivo,
         status = EXCLUDED.status,
         criado_em = EXCLUDED.criado_em,
         atualizado_em = EXCLUDED.atualizado_em`,
      row
    )
  } else {
    await sqliteClient.execute({
      sql: `INSERT OR REPLACE INTO solicitacoes_cadastro (id, nome, email, telefone, motivo, status, criado_em, atualizado_em)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      args: row
    })
  }
  ns++
}

console.log(`Importação concluída: ${nu} usuários, ${nt} tarefas, ${np} produtos, ${ns} solicitações.`)

if (pg) await pg.end()
