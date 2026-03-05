export type EnviarSmsConfig = {
  numero: string
  mensagem: string
}

const API_URL = import.meta.env.VITE_SMS_API_URL ?? 'https://textbelt.com/text'
const API_KEY = import.meta.env.VITE_SMS_API_KEY ?? 'textbelt'

export async function enviarMensagemSms({ numero, mensagem }: EnviarSmsConfig) {
  if (!numero) {
    return
  }

  try {
    const corpo = new URLSearchParams({
      phone: numero,
      message: mensagem,
      key: API_KEY
    })

    const resposta = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: corpo.toString()
    })

    if (!resposta.ok) {
      const texto = await resposta.text()
      console.error('[sms] Erro ao enviar mensagem:', resposta.status, texto)
    } else {
      const resultado = await resposta.json().catch(() => null)
      if (resultado && resultado.success === false) {
        console.warn('[sms] Envio não confirmado:', resultado)
      }
    }
  } catch (erro) {
    console.error('[sms] Falha ao enviar SMS:', erro)
  }
}

