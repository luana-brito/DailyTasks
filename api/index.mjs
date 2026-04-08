import 'dotenv/config'
import { createApp } from '../server/src/app.js'

let appInstance

export default async function handler(req, res) {
  if (!appInstance) {
    appInstance = await createApp()
  }
  return appInstance(req, res)
}
