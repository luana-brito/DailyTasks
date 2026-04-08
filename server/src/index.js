import 'dotenv/config'
import { createApp } from './app.js'

const PORT = Number(process.env.PORT) || 3333
const app = await createApp()
app.listen(PORT, () => {
  console.log(`API DailyTasks em http://localhost:${PORT}`)
})
