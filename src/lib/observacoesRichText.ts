import DOMPurify from 'dompurify'

/** Tamanho máximo do HTML das observações ao persistir (bytes aproximados). */
export const LIMITE_OBSERVACOES_HTML = 20_000

const TAGS_PERMITIDAS = [
  'p',
  'br',
  'strong',
  'b',
  'em',
  'i',
  'u',
  's',
  'strike',
  'a',
  'ul',
  'ol',
  'li',
  'h2',
  'h3',
  'blockquote',
  'code',
  'pre'
]

const ATRIBUTOS_PERMITIDOS = ['href', 'target', 'rel', 'class']

export function sanitizarObservacoesHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: TAGS_PERMITIDAS,
    ALLOWED_ATTR: ATRIBUTOS_PERMITIDOS,
    ALLOW_DATA_ATTR: false
  })
}

export function extrairTextoPlanoObservacao(raw: string | undefined | null): string {
  const t = raw?.trim() ?? ''
  if (!t) return ''
  if (!/<[a-z][\s\S]*>/i.test(t)) return t.replace(/\s+/g, ' ').trim()
  if (typeof document === 'undefined') {
    return t.replace(/<[^>]*>/gi, ' ').replace(/\s+/g, ' ').trim()
  }
  const div = document.createElement('div')
  div.innerHTML = sanitizarObservacoesHtml(t)
  return (div.textContent ?? '').replace(/\s+/g, ' ').trim()
}

export function observacoesHtmlVazio(raw: string | undefined | null): boolean {
  return extrairTextoPlanoObservacao(raw) === ''
}

export function normalizarObservacoesParaSalvar(s?: string | null): string | undefined {
  if (s == null || !String(s).trim()) return undefined
  if (observacoesHtmlVazio(s)) return undefined
  let out = sanitizarObservacoesHtml(s.trim())
  if (observacoesHtmlVazio(out)) return undefined
  if (out.length > LIMITE_OBSERVACOES_HTML) {
    out = out.slice(0, LIMITE_OBSERVACOES_HTML)
  }
  return out
}
