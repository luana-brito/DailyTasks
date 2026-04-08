import express from 'express'
import cors from 'cors'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { randomUUID } from 'crypto'
import {
  createDatabase,
  rowToUsuario,
  rowToProduto,
  rowToTarefa,
  rowToSolicitacao
} from './db.js'

const JWT_SECRET = process.env.JWT_SECRET || 'defina-jwt-secret-no-env'
const SALT_ROUNDS = 10

function ah(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next)
  }
}

function signToken(userId) {
  return jwt.sign({ sub: userId }, JWT_SECRET, { expiresIn: '30d' })
}

function authMiddleware(req, res, next) {
  const h = req.headers.authorization
  if (!h?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Não autenticado.' })
  }
  const token = h.slice(7)
  try {
    const payload = jwt.verify(token, JWT_SECRET)
    req.userId = payload.sub
    next()
  } catch {
    return res.status(401).json({ error: 'Sessão inválida ou expirada.' })
  }
}

function requireAdmin(db) {
  return ah(async (req, res, next) => {
    const u = await db.get('SELECT * FROM users WHERE id = ?', [req.userId])
    if (!u || u.status !== 'ATIVO') return res.status(403).json({ error: 'Acesso negado.' })
    if (u.role !== 'ADMIN') return res.status(403).json({ error: 'Apenas administradores.' })
    next()
  })
}

async function bootstrapAdminIfEmpty(db) {
  const row = await db.get('SELECT COUNT(*) AS c FROM users', [])
  const n = row?.c ?? 0
  if (n > 0) return
  const id = randomUUID()
  const email = (process.env.BOOTSTRAP_ADMIN_EMAIL || 'admin@local').trim().toLowerCase()
  const password = process.env.BOOTSTRAP_ADMIN_PASSWORD || 'admin123'
  const hash = bcrypt.hashSync(password, SALT_ROUNDS)
  const now = new Date().toISOString()
  await db.run(
    `INSERT INTO users (id, login, email, password_hash, nome, telefone, status, role, criado_em, atualizado_em)
     VALUES (?, ?, ?, ?, ?, ?, 'ATIVO', 'ADMIN', ?, ?)`,
    [id, email, email, hash, 'Administrador', '0000000000', now, now]
  )
  console.log(`[bootstrap] Usuário admin criado: ${email}`)
}

export async function createApp() {
  const db = await createDatabase()
  await bootstrapAdminIfEmpty(db)

  const app = express()
  const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',')
    .map((s) => s.trim())
    .filter(Boolean)
  if (allowedOrigins?.length) {
    app.use(
      cors({
        origin(origin, cb) {
          if (!origin) return cb(null, true)
          if (allowedOrigins.includes(origin)) return cb(null, true)
          cb(null, false)
        }
      })
    )
  } else {
    app.use(cors())
  }
  app.use(express.json({ limit: '2mb' }))

  app.post(
    '/api/auth/login',
    ah(async (req, res) => {
      const email = String(req.body?.email || '').trim().toLowerCase()
      const password = String(req.body?.password || '')
      if (!email || !password) {
        return res.status(400).json({ error: 'E-mail e senha são obrigatórios.' })
      }
      const row = await db.get('SELECT * FROM users WHERE lower(email) = lower(?)', [email])
      if (!row || row.status !== 'ATIVO') {
        return res.status(401).json({ error: 'E-mail ou senha incorretos.' })
      }
      if (!bcrypt.compareSync(password, row.password_hash)) {
        return res.status(401).json({ error: 'E-mail ou senha incorretos.' })
      }
      const token = signToken(row.id)
      res.json({ token, user: rowToUsuario(row) })
    })
  )

  app.get(
    '/api/auth/me',
    authMiddleware,
    ah(async (req, res) => {
      const row = await db.get('SELECT * FROM users WHERE id = ?', [req.userId])
      if (!row || row.status !== 'ATIVO') {
        return res.status(401).json({ error: 'Usuário inválido ou inativo.' })
      }
      res.json(rowToUsuario(row))
    })
  )

  app.get(
    '/api/usuarios',
    authMiddleware,
    ah(async (req, res) => {
      const rows = await db.all('SELECT * FROM users ORDER BY lower(nome)', [])
      res.json(rows.map(rowToUsuario))
    })
  )

  app.get(
    '/api/usuarios/export',
    authMiddleware,
    requireAdmin(db),
    ah(async (req, res) => {
      const rows = await db.all('SELECT * FROM users ORDER BY lower(nome)', [])
      res.json({
        app: 'dailytasks-users',
        version: 1,
        exportedAt: new Date().toISOString(),
        users: rows.map((row) => ({
          id: row.id,
          login: row.login,
          email: row.email,
          password_hash: row.password_hash,
          nome: row.nome,
          telefone: row.telefone,
          status: row.status,
          role: row.role,
          criado_em: row.criado_em,
          atualizado_em: row.atualizado_em
        }))
      })
    })
  )

  app.post(
    '/api/usuarios/import',
    authMiddleware,
    requireAdmin(db),
    ah(async (req, res) => {
      const body = req.body
      let list = Array.isArray(body) ? body : body?.users
      if (!Array.isArray(list) || list.length === 0) {
        return res.status(400).json({ error: 'Envie um objeto { users: [...] } ou um array de utilizadores.' })
      }

      const normalized = []
      const emailsSeen = new Set()
      for (let i = 0; i < list.length; i++) {
        const u = list[i]
        const id = String(u?.id || '').trim()
        const login = String(u?.login || '').trim()
        const email = String(u?.email || '').trim().toLowerCase()
        const password_hash = String(u?.password_hash || '').trim()
        const nome = String(u?.nome || '').trim()
        const telefone = String(u?.telefone || '').replace(/\D/g, '')
        const status = u?.status === 'INATIVO' ? 'INATIVO' : 'ATIVO'
        const role = u?.role === 'ADMIN' ? 'ADMIN' : 'USUARIO'
        const criado_em = String(u?.criado_em || '').trim() || new Date().toISOString()
        const atualizado_em = String(u?.atualizado_em || '').trim() || new Date().toISOString()

        if (!id || !login || !email || !password_hash || !nome) {
          return res.status(400).json({ error: `Linha ${i + 1}: id, login, email, password_hash e nome são obrigatórios.` })
        }
        if (telefone.length < 10) {
          return res.status(400).json({ error: `Linha ${i + 1}: telefone inválido (${email}).` })
        }
        if (emailsSeen.has(email)) {
          return res.status(400).json({ error: `E-mail duplicado no ficheiro: ${email}` })
        }
        emailsSeen.add(email)
        normalized.push({
          id,
          login,
          email,
          password_hash,
          nome,
          telefone,
          status,
          role,
          criado_em,
          atualizado_em
        })
      }

      const existing = await db.all('SELECT * FROM users', [])
      const byId = Object.fromEntries(existing.map((r) => [r.id, { ...r }]))
      for (const u of normalized) {
        byId[u.id] = { ...u }
      }
      const activeAdmins = Object.values(byId).filter((r) => r.role === 'ADMIN' && r.status === 'ATIVO').length
      if (activeAdmins < 1) {
        return res.status(400).json({
          error: 'O resultado teria zero administradores ativos. Corrija o ficheiro antes de importar.'
        })
      }

      const ex = db.isPostgres ? 'EXCLUDED' : 'excluded'
      for (const u of normalized) {
        const clash = await db.get('SELECT id FROM users WHERE lower(email) = lower(?) AND id != ?', [
          u.email,
          u.id
        ])
        if (clash) {
          return res.status(409).json({
            error: `E-mail ${u.email} já pertence a outro utilizador (id diferente).`
          })
        }
        await db.run(
          `INSERT INTO users (id, login, email, password_hash, nome, telefone, status, role, criado_em, atualizado_em)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT (id) DO UPDATE SET
             login = ${ex}.login,
             email = ${ex}.email,
             password_hash = ${ex}.password_hash,
             nome = ${ex}.nome,
             telefone = ${ex}.telefone,
             status = ${ex}.status,
             role = ${ex}.role,
             criado_em = ${ex}.criado_em,
             atualizado_em = ${ex}.atualizado_em`,
          [
            u.id,
            u.login,
            u.email,
            u.password_hash,
            u.nome,
            u.telefone,
            u.status,
            u.role,
            u.criado_em,
            u.atualizado_em
          ]
        )
      }

      res.json({ ok: true, imported: normalized.length })
    })
  )

  app.post(
    '/api/usuarios',
    authMiddleware,
    requireAdmin(db),
    ah(async (req, res) => {
      const email = String(req.body?.email || '').trim().toLowerCase()
      const password = String(req.body?.password || '')
      const nome = String(req.body?.nome || '').trim()
      const telefone = String(req.body?.telefone || '').replace(/\D/g, '')
      const login = String(req.body?.login || email).trim()
      const status = req.body?.status === 'INATIVO' ? 'INATIVO' : 'ATIVO'
      const role = req.body?.role === 'ADMIN' ? 'ADMIN' : 'USUARIO'

      if (!email || !password || password.length < 6) {
        return res.status(400).json({ error: 'E-mail e senha (mín. 6 caracteres) são obrigatórios.' })
      }
      if (!nome) return res.status(400).json({ error: 'Nome é obrigatório.' })
      if (telefone.length < 10) {
        return res.status(400).json({ error: 'Telefone inválido.' })
      }

      const exists = await db.get('SELECT id FROM users WHERE lower(email) = lower(?)', [email])
      if (exists) return res.status(409).json({ error: 'E-mail já cadastrado.' })

      const id = randomUUID()
      const hash = bcrypt.hashSync(password, SALT_ROUNDS)
      const now = new Date().toISOString()
      await db.run(
        `INSERT INTO users (id, login, email, password_hash, nome, telefone, status, role, criado_em, atualizado_em)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, login, email, hash, nome, telefone, status, role, now, now]
      )

      const row = await db.get('SELECT * FROM users WHERE id = ?', [id])
      res.status(201).json(rowToUsuario(row))
    })
  )

  app.patch(
    '/api/usuarios/:id',
    authMiddleware,
    ah(async (req, res) => {
      const id = req.params.id
      const row = await db.get('SELECT * FROM users WHERE id = ?', [id])
      if (!row) return res.status(404).json({ error: 'Usuário não encontrado.' })

      const me = await db.get('SELECT * FROM users WHERE id = ?', [req.userId])
      const isAdmin = me.role === 'ADMIN' && me.status === 'ATIVO'
      const isSelf = me.id === id

      if (!isAdmin && !isSelf) {
        return res.status(403).json({ error: 'Sem permissão.' })
      }

      const nome = req.body.nome != null ? String(req.body.nome).trim() : undefined
      const telefone =
        req.body.telefone != null ? String(req.body.telefone).replace(/\D/g, '') : undefined
      let status = req.body.status
      let role = req.body.role
      const novaSenha = req.body.password != null ? String(req.body.password) : undefined
      const senhaAtual = req.body.currentPassword != null ? String(req.body.currentPassword) : undefined

      if (!isAdmin) {
        status = undefined
        role = undefined
        if (novaSenha) {
          if (!senhaAtual || !bcrypt.compareSync(senhaAtual, row.password_hash)) {
            return res.status(400).json({ error: 'Senha atual incorreta.' })
          }
          if (novaSenha.length < 6) {
            return res.status(400).json({ error: 'A nova senha deve ter pelo menos 6 caracteres.' })
          }
        }
      } else if (novaSenha && novaSenha.length < 6) {
        return res.status(400).json({ error: 'A senha deve ter pelo menos 6 caracteres.' })
      }

      const updates = []
      const vals = []

      if (nome !== undefined) {
        updates.push('nome = ?')
        vals.push(nome)
      }
      if (telefone !== undefined) {
        if (telefone.length < 10) return res.status(400).json({ error: 'Telefone inválido.' })
        updates.push('telefone = ?')
        vals.push(telefone)
      }
      if (isAdmin && status != null) {
        updates.push('status = ?')
        vals.push(status)
      }
      if (isAdmin && role != null) {
        updates.push('role = ?')
        vals.push(role)
      }
      if (novaSenha) {
        updates.push('password_hash = ?')
        vals.push(bcrypt.hashSync(novaSenha, SALT_ROUNDS))
      }

      if (updates.length === 0) {
        return res.json(rowToUsuario(row))
      }

      updates.push('atualizado_em = ?')
      vals.push(new Date().toISOString())
      vals.push(id)

      await db.run(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, vals)
      const updated = await db.get('SELECT * FROM users WHERE id = ?', [id])
      res.json(rowToUsuario(updated))
    })
  )

  app.delete(
    '/api/usuarios/:id',
    authMiddleware,
    requireAdmin(db),
    ah(async (req, res) => {
      const id = req.params.id
      const row = await db.get('SELECT * FROM users WHERE id = ?', [id])
      if (!row) return res.status(404).json({ error: 'Usuário não encontrado.' })

      const ativosRow = await db.get("SELECT COUNT(*) AS c FROM users WHERE status = 'ATIVO'", [])
      const ativos = ativosRow?.c ?? 0
      if (row.status === 'ATIVO' && ativos <= 1) {
        return res.status(400).json({ error: 'Não é possível excluir o último usuário ativo.' })
      }

      const adminsRow = await db.get("SELECT COUNT(*) AS c FROM users WHERE role = 'ADMIN'", [])
      const admins = adminsRow?.c ?? 0
      if (row.role === 'ADMIN' && admins <= 1) {
        return res.status(400).json({ error: 'Não é possível excluir o último administrador.' })
      }

      await db.run('DELETE FROM users WHERE id = ?', [id])
      res.status(204).end()
    })
  )

  app.get(
    '/api/produtos',
    authMiddleware,
    ah(async (req, res) => {
      const rows = await db.all('SELECT * FROM produtos', [])
      res.json(rows.map(rowToProduto))
    })
  )

  app.post(
    '/api/produtos',
    authMiddleware,
    ah(async (req, res) => {
      const nome = String(req.body?.nome || '').trim()
      if (!nome) return res.status(400).json({ error: 'Nome do produto é obrigatório.' })
      const executiva = req.body.executiva || null
      const ativo = req.body.ativo === false ? 0 : 1
      const id = randomUUID()
      const now = new Date().toISOString()
      await db.run(
        `INSERT INTO produtos (id, nome, executiva, ativo, criado_em, atualizado_em)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [id, nome, executiva, ativo, now, now]
      )
      const row = await db.get('SELECT * FROM produtos WHERE id = ?', [id])
      res.status(201).json(rowToProduto(row))
    })
  )

  app.patch(
    '/api/produtos/:id',
    authMiddleware,
    ah(async (req, res) => {
      const row = await db.get('SELECT * FROM produtos WHERE id = ?', [req.params.id])
      if (!row) return res.status(404).json({ error: 'Produto não encontrado.' })

      const nome = req.body.nome != null ? String(req.body.nome).trim() : undefined
      const executiva = req.body.executiva !== undefined ? req.body.executiva : undefined
      const ativo = req.body.ativo !== undefined ? (req.body.ativo ? 1 : 0) : undefined

      const updates = []
      const vals = []
      if (nome !== undefined) {
        updates.push('nome = ?')
        vals.push(nome)
      }
      if (executiva !== undefined) {
        updates.push('executiva = ?')
        vals.push(executiva)
      }
      if (ativo !== undefined) {
        updates.push('ativo = ?')
        vals.push(ativo)
      }
      if (updates.length === 0) return res.json(rowToProduto(row))

      updates.push('atualizado_em = ?')
      vals.push(new Date().toISOString())
      vals.push(req.params.id)
      await db.run(`UPDATE produtos SET ${updates.join(', ')} WHERE id = ?`, vals)
      const updated = await db.get('SELECT * FROM produtos WHERE id = ?', [req.params.id])
      res.json(rowToProduto(updated))
    })
  )

  app.delete(
    '/api/produtos/:id',
    authMiddleware,
    ah(async (req, res) => {
      const r = await db.run('DELETE FROM produtos WHERE id = ?', [req.params.id])
      if (r.changes === 0) return res.status(404).json({ error: 'Produto não encontrado.' })
      res.status(204).end()
    })
  )

  app.get(
    '/api/tarefas',
    authMiddleware,
    ah(async (req, res) => {
      const rows = await db.all('SELECT * FROM tarefas', [])
      res.json(rows.map(rowToTarefa))
    })
  )

  app.post(
    '/api/tarefas',
    authMiddleware,
    ah(async (req, res) => {
      const b = req.body || {}
      const id = randomUUID()
      const now = new Date().toISOString()
      const atribuidoIds = Array.isArray(b.atribuidoIds) ? b.atribuidoIds : []

      await db.run(
        `INSERT INTO tarefas (
      id, titulo, produto, status, prioridade, tempo_trabalhado_horas, observacoes, data,
      atribuido_ids, criado_por_id, parent_id, cronometro_segundos_acumulados, cronometro_inicio_em,
      criada_em, atualizada_em
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          String(b.titulo || ''),
          String(b.produto || ''),
          String(b.status || 'NOVO'),
          String(b.prioridade || 'MEDIA'),
          b.tempoTrabalhadoHoras != null ? Number(b.tempoTrabalhadoHoras) : null,
          b.observacoes != null ? String(b.observacoes) : null,
          String(b.data || new Date().toISOString().slice(0, 10)),
          JSON.stringify(atribuidoIds),
          String(b.criadoPorId || ''),
          b.parentId || null,
          b.cronometroSegundosAcumulados != null ? Number(b.cronometroSegundosAcumulados) : null,
          b.cronometroInicioEm || null,
          now,
          now
        ]
      )

      const row = await db.get('SELECT * FROM tarefas WHERE id = ?', [id])
      res.status(201).json(rowToTarefa(row))
    })
  )

  app.patch(
    '/api/tarefas/:id',
    authMiddleware,
    ah(async (req, res) => {
      const id = req.params.id
      const row = await db.get('SELECT * FROM tarefas WHERE id = ?', [id])
      if (!row) return res.status(404).json({ error: 'Tarefa não encontrada.' })

      const b = { ...(req.body || {}) }
      const removeCronometroInicio = Boolean(b.removeCronometroInicio)
      const removeTempoTrabalhado = Boolean(b.removeTempoTrabalhado)
      delete b.removeCronometroInicio
      delete b.removeTempoTrabalhado

      const cur = rowToTarefa(row)
      const merged = { ...cur, ...mapBodyToTarefaPatch(b) }

      const tempoSql = removeTempoTrabalhado
        ? null
        : merged.tempoTrabalhadoHoras !== undefined && merged.tempoTrabalhadoHoras !== null
          ? Number(merged.tempoTrabalhadoHoras)
          : cur.tempoTrabalhadoHoras !== undefined && cur.tempoTrabalhadoHoras !== null
            ? Number(cur.tempoTrabalhadoHoras)
            : null

      const cronInicioSql = removeCronometroInicio
        ? null
        : merged.cronometroInicioEm != null && merged.cronometroInicioEm !== ''
          ? String(merged.cronometroInicioEm)
          : cur.cronometroInicioEm != null
            ? String(cur.cronometroInicioEm)
            : null

      const cronSegSql =
        merged.cronometroSegundosAcumulados != null
          ? Number(merged.cronometroSegundosAcumulados)
          : cur.cronometroSegundosAcumulados != null
            ? Number(cur.cronometroSegundosAcumulados)
            : null

      const now = new Date().toISOString()
      await db.run(
        `UPDATE tarefas SET
      titulo = ?, produto = ?, status = ?, prioridade = ?,
      tempo_trabalhado_horas = ?, observacoes = ?, data = ?,
      atribuido_ids = ?, criado_por_id = ?, parent_id = ?,
      cronometro_segundos_acumulados = ?, cronometro_inicio_em = ?,
      atualizada_em = ?
    WHERE id = ?`,
        [
          merged.titulo,
          merged.produto,
          merged.status,
          merged.prioridade,
          tempoSql,
          merged.observacoes ?? null,
          merged.data,
          JSON.stringify(merged.atribuidoIds ?? []),
          merged.criadoPorId,
          merged.parentId ?? null,
          cronSegSql,
          cronInicioSql,
          now,
          id
        ]
      )

      const updated = await db.get('SELECT * FROM tarefas WHERE id = ?', [id])
      res.json(rowToTarefa(updated))
    })
  )

  app.delete(
    '/api/tarefas/:id',
    authMiddleware,
    ah(async (req, res) => {
      const r = await db.run('DELETE FROM tarefas WHERE id = ?', [req.params.id])
      if (r.changes === 0) return res.status(404).json({ error: 'Tarefa não encontrada.' })
      res.status(204).end()
    })
  )

  app.get(
    '/api/solicitacoes',
    authMiddleware,
    requireAdmin(db),
    ah(async (req, res) => {
      const status = req.query.status
      let rows
      if (status) {
        rows = await db.all('SELECT * FROM solicitacoes_cadastro WHERE status = ?', [String(status)])
      } else {
        rows = await db.all('SELECT * FROM solicitacoes_cadastro', [])
      }
      res.json(rows.map(rowToSolicitacao))
    })
  )

  app.post(
    '/api/solicitacoes',
    ah(async (req, res) => {
      const b = req.body || {}
      const nome = String(b.nome || '').trim()
      const email = String(b.email || '').trim().toLowerCase()
      const telefone = String(b.telefone || '').replace(/\D/g, '')
      const motivo = b.motivo != null ? String(b.motivo) : null

      if (!nome || !email || telefone.length < 10) {
        return res.status(400).json({ error: 'Dados inválidos.' })
      }

      const exists = await db.get('SELECT id FROM users WHERE lower(email) = lower(?)', [email])
      if (exists) return res.status(409).json({ error: 'E-mail já cadastrado.' })

      const id = randomUUID()
      const now = new Date().toISOString()
      await db.run(
        `INSERT INTO solicitacoes_cadastro (id, nome, email, telefone, motivo, status, criado_em, atualizado_em)
         VALUES (?, ?, ?, ?, ?, 'PENDENTE', ?, ?)`,
        [id, nome, email, telefone, motivo, now, now]
      )

      const row = await db.get('SELECT * FROM solicitacoes_cadastro WHERE id = ?', [id])
      res.status(201).json(rowToSolicitacao(row))
    })
  )

  app.patch(
    '/api/solicitacoes/:id',
    authMiddleware,
    requireAdmin(db),
    ah(async (req, res) => {
      const status = req.body?.status
      if (!['PENDENTE', 'APROVADO', 'RECUSADO'].includes(status)) {
        return res.status(400).json({ error: 'Status inválido.' })
      }
      const id = req.params.id
      const r = await db.run(
        'UPDATE solicitacoes_cadastro SET status = ?, atualizado_em = ? WHERE id = ?',
        [status, new Date().toISOString(), id]
      )
      if (r.changes === 0) return res.status(404).json({ error: 'Solicitação não encontrada.' })
      const row = await db.get('SELECT * FROM solicitacoes_cadastro WHERE id = ?', [id])
      res.json(rowToSolicitacao(row))
    })
  )

  app.delete(
    '/api/solicitacoes/:id',
    authMiddleware,
    requireAdmin(db),
    ah(async (req, res) => {
      const r = await db.run('DELETE FROM solicitacoes_cadastro WHERE id = ?', [req.params.id])
      if (r.changes === 0) return res.status(404).json({ error: 'Solicitação não encontrada.' })
      res.status(204).end()
    })
  )

  app.use((err, req, res, next) => {
    console.error(err)
    res.status(500).json({ error: 'Erro interno do servidor.' })
  })

  return app
}

function mapBodyToTarefaPatch(b) {
  const p = {}
  if (b.titulo !== undefined) p.titulo = String(b.titulo)
  if (b.produto !== undefined) p.produto = String(b.produto)
  if (b.status !== undefined) p.status = String(b.status)
  if (b.prioridade !== undefined) p.prioridade = String(b.prioridade)
  if (b.tempoTrabalhadoHoras !== undefined) p.tempoTrabalhadoHoras = Number(b.tempoTrabalhadoHoras)
  if (b.observacoes !== undefined) p.observacoes = b.observacoes
  if (b.data !== undefined) p.data = String(b.data)
  if (b.atribuidoIds !== undefined) p.atribuidoIds = b.atribuidoIds
  if (b.criadoPorId !== undefined) p.criadoPorId = String(b.criadoPorId)
  if (b.parentId !== undefined) p.parentId = b.parentId || undefined
  if (b.cronometroSegundosAcumulados !== undefined)
    p.cronometroSegundosAcumulados = b.cronometroSegundosAcumulados
  if (b.cronometroInicioEm !== undefined) p.cronometroInicioEm = b.cronometroInicioEm
  return p
}
