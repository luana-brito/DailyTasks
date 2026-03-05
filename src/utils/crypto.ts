const encoder = typeof TextEncoder !== 'undefined' ? new TextEncoder() : null

function bufferToHex(buffer: ArrayBuffer) {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

export async function gerarHashSenha(senha: string): Promise<string> {
  if (typeof senha !== 'string') {
    throw new Error('Senha inválida')
  }

  const normalizada = senha.normalize('NFKC')

  try {
    if (typeof window !== 'undefined' && window.crypto?.subtle && encoder) {
      const dados = encoder.encode(normalizada)
      const hashBuffer = await window.crypto.subtle.digest('SHA-256', dados)
      return bufferToHex(hashBuffer)
    }
  } catch {
    // fallback logo abaixo
  }

  return btoa(unescape(encodeURIComponent(normalizada)))
}

export async function compararSenhaComHash(senha: string, hash: string): Promise<boolean> {
  const hashGerado = await gerarHashSenha(senha)
  return hashGerado === hash
}


