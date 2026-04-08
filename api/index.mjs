import 'dotenv/config'
import { createApp } from '../server/src/app.js'

let appInstance

function sendJson(res, status, body) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.end(JSON.stringify(body))
}

export default async function handler(req, res) {
  try {
    if (!appInstance) {
      appInstance = await createApp()
    }
    return appInstance(req, res)
  } catch (err) {
    console.error('[api/bootstrap]', err)
    const msg = err instanceof Error ? err.message : String(err)
    const isConfigHint = /DATABASE_URL|PostgreSQL|serverless|SQLite em ficheiro/i.test(msg)
    if (!res.headersSent) {
      sendJson(res, 503, {
        error: isConfigHint
          ? msg
          : 'A API não pôde iniciar. Abra os logs da função serverless no painel da Vercel.'
      })
    }
  }
}
