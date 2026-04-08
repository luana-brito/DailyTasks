/**
 * Em desenvolvimento o Vite encaminha `/api` → `http://localhost:3333`.
 * Em produção na Vercel (app + API no mesmo deploy): mesma origem → base vazia (`/api/...`).
 * Se a API estiver em outro domínio, defina `VITE_API_URL` (sem barra no final).
 */
export function getApiUrl(): string {
  if (import.meta.env.DEV) return ''
  const raw = (import.meta.env.VITE_API_URL as string | undefined)?.trim()
  if (raw) return raw.replace(/\/$/, '')
  return ''
}

export const AUTH_TOKEN_KEY = 'dailytasks_token'
