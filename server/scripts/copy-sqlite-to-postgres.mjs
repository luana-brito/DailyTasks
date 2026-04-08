/**
 * Copia todos os dados do SQLite local (server/database.sqlite) para PostgreSQL.
 * Use para povoar a base de PRODUÇÃO com o que tens no PC.
 *
 * Requisitos:
 *   - DATABASE_URL = connection string do Postgres (ex.: Neon de produção)
 *   - Ficheiro SQLite por defeito: server/database.sqlite
 *     (ou SOURCE_SQLITE_PATH=caminho/completo/database.sqlite)
 *
 * Uso (na pasta server):
 *   set DATABASE_URL=postgresql://...
 *   npm run migrate:sqlite-to-pg
 *
 * PowerShell:
 *   $env:DATABASE_URL = "postgresql://..."
 *   npm run migrate:sqlite-to-pg
 *
 * Aviso: utilizadores com o mesmo `id` em ambos os lados são atualizados no Postgres (UPSERT).
 */

import 'dotenv/config'
import { createClient } from '@libsql/client'
import postgres from 'postgres'
import { dirname, join } from 'path'
import { fileURLToPath, pathToFileURL } from 'url'
import { existsSync } from 'fs'
import { POSTGRES_DDL } from '../src/db.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

const databaseUrl = process.env.DATABASE_URL?.trim()
const sqlitePath = process.env.SOURCE_SQLITE_PATH?.trim() || join(__dirname, '..', 'database.sqlite')

if (!databaseUrl) {
  console.error('Erro: defina DATABASE_URL com a connection string PostgreSQL de destino (ex.: produção).')
  process.exit(1)
}
if (!existsSync(sqlitePath)) {
  console.error('Erro: ficheiro SQLite não encontrado:', sqlitePath)
  console.error('Ajuste SOURCE_SQLITE_PATH ou crie dados em server/database.sqlite (npm run dev local).')
  process.exit(1)
}

const pg = postgres(databaseUrl, {
  max: 2,
  prepare: process.env.PG_PREPARE === 'true'
})

for (const statement of POSTGRES_DDL) {
  await pg.unsafe(statement)
}

const sqlite = createClient({ url: pathToFileURL(sqlitePath).href })

console.log('Origem (SQLite):', sqlitePath)
console.log('Destino (PostgreSQL):', databaseUrl.replace(/:[^:@]+@/, ':****@'))
console.log('')

const { rows: userRows } = await sqlite.execute({ sql: 'SELECT * FROM users', args: [] })
let nu = 0
for (const r of userRows) {
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
    [
      r.id,
      r.login,
      r.email,
      r.password_hash,
      r.nome,
      r.telefone,
      r.status,
      r.role,
      r.criado_em,
      r.atualizado_em
    ]
  )
  nu++
}

const { rows: prodRows } = await sqlite.execute({ sql: 'SELECT * FROM produtos', args: [] })
let np = 0
for (const r of prodRows) {
  const ativo = r.ativo === 1 || r.ativo === true
  await pg.unsafe(
    `INSERT INTO produtos (id, nome, executiva, ativo, criado_em, atualizado_em)
     VALUES ($1,$2,$3,$4::boolean,$5,$6)
     ON CONFLICT (id) DO UPDATE SET
       nome = EXCLUDED.nome,
       executiva = EXCLUDED.executiva,
       ativo = EXCLUDED.ativo,
       criado_em = EXCLUDED.criado_em,
       atualizado_em = EXCLUDED.atualizado_em`,
    [r.id, r.nome, r.executiva ?? null, ativo, r.criado_em, r.atualizado_em]
  )
  np++
}

const { rows: tarefaRows } = await sqlite.execute({ sql: 'SELECT * FROM tarefas', args: [] })
let nt = 0
for (const r of tarefaRows) {
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
    [
      r.id,
      r.titulo,
      r.produto,
      r.status,
      r.prioridade,
      r.tempo_trabalhado_horas ?? null,
      r.observacoes ?? null,
      r.data,
      r.atribuido_ids,
      r.criado_por_id,
      r.parent_id ?? null,
      r.cronometro_segundos_acumulados ?? null,
      r.cronometro_inicio_em ?? null,
      r.criada_em,
      r.atualizada_em
    ]
  )
  nt++
}

const { rows: solRows } = await sqlite.execute({ sql: 'SELECT * FROM solicitacoes_cadastro', args: [] })
let ns = 0
for (const r of solRows) {
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
    [
      r.id,
      r.nome,
      r.email,
      r.telefone,
      r.motivo ?? null,
      r.status,
      r.criado_em,
      r.atualizado_em
    ]
  )
  ns++
}

await pg.end()

console.log('Concluído:', nu, 'utilizadores,', np, 'produtos,', nt, 'tarefas,', ns, 'solicitações.')
console.log('Volta a abrir o site em produção e faz login com as mesmas credenciais do SQLite.')
