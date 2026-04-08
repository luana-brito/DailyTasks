/**
 * Importa um JSON de backup (mapas documentoId → campos) para SQLite (arquivo local ou Turso).
 *
 * Uso (na pasta server):
 *   IMPORT_DEFAULT_PASSWORD=senhaTemporaria123 npm run import-firestore -- ../backup.json
 *
 * Para importar na Turso (produção), defina TURSO_DATABASE_URL e TURSO_AUTH_TOKEN.
 */

import 'dotenv/config'
import fs from 'fs'
import bcrypt from 'bcryptjs'
import { dirname, join } from 'path'
import { fileURLToPath, pathToFileURL } from 'url'
import { createClient } from '@libsql/client'

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

const tursoUrl = process.env.TURSO_DATABASE_URL?.trim()
const authToken = process.env.TURSO_AUTH_TOKEN?.trim()
let client
if (tursoUrl) {
  client = createClient({ url: tursoUrl, authToken: authToken || undefined })
} else {
  const dbPath = process.env.DATABASE_PATH || join(__dirname, '..', 'database.sqlite')
  client = createClient({ url: pathToFileURL(dbPath).href })
}

const ddl = [
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
for (const sql of ddl) {
  await client.execute(sql)
}

let nu = 0,
  nt = 0,
  np = 0,
  ns = 0

const usuarios = raw.usuarios || {}
for (const [id, d] of Object.entries(usuarios)) {
  const email = String(d.email || d.login || '').trim().toLowerCase()
  if (!email) continue
  await client.execute({
    sql: `INSERT OR REPLACE INTO users (id, login, email, password_hash, nome, telefone, status, role, criado_em, atualizado_em)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
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
  })
  nu++
}

const produtos = raw.produtos || {}
for (const [id, d] of Object.entries(produtos)) {
  await client.execute({
    sql: `INSERT OR REPLACE INTO produtos (id, nome, executiva, ativo, criado_em, atualizado_em)
          VALUES (?, ?, ?, ?, ?, ?)`,
    args: [
      id,
      String(d.nome || '').trim() || '—',
      d.executiva || null,
      d.ativo === false ? 0 : 1,
      parseTime(d.criadoEm),
      parseTime(d.atualizadoEm)
    ]
  })
  np++
}

const tarefas = raw.tarefas || {}
for (const [id, d] of Object.entries(tarefas)) {
  const atribuidoIds = Array.isArray(d.atribuidoIds) ? d.atribuidoIds : []
  await client.execute({
    sql: `INSERT OR REPLACE INTO tarefas (
      id, titulo, produto, status, prioridade, tempo_trabalhado_horas, observacoes, data,
      atribuido_ids, criado_por_id, parent_id, cronometro_segundos_acumulados, cronometro_inicio_em,
      criada_em, atualizada_em
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
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
  })
  nt++
}

const sol = raw.solicitacoes_cadastro || {}
for (const [id, d] of Object.entries(sol)) {
  await client.execute({
    sql: `INSERT OR REPLACE INTO solicitacoes_cadastro (id, nome, email, telefone, motivo, status, criado_em, atualizado_em)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      id,
      String(d.nome || ''),
      String(d.email || '').trim().toLowerCase(),
      String(d.telefone || '').replace(/\D/g, ''),
      d.motivo != null ? String(d.motivo) : null,
      ['PENDENTE', 'APROVADO', 'RECUSADO'].includes(d.status) ? d.status : 'PENDENTE',
      parseTime(d.criadoEm),
      parseTime(d.atualizadoEm)
    ]
  })
  ns++
}

console.log(`Importação concluída: ${nu} usuários, ${nt} tarefas, ${np} produtos, ${ns} solicitações.`)
