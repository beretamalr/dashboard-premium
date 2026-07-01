const STORAGE_KEY = 'bkf_security_code_hash'

function normalizarCodigo(codigo) {
  return String(codigo || '').trim()
}

async function hashCodigo(codigo) {
  const texto = normalizarCodigo(codigo)

  if (!texto) {
    return ''
  }

  if (globalThis.crypto?.subtle) {
    const buffer = await globalThis.crypto.subtle.digest(
      'SHA-256',
      new TextEncoder().encode(texto),
    )

    return Array.from(new Uint8Array(buffer))
      .map((byte) => byte.toString(16).padStart(2, '0'))
      .join('')
  }

  return btoa(unescape(encodeURIComponent(texto)))
}

export function tieneCodigoSeguridad() {
  return Boolean(localStorage.getItem(STORAGE_KEY))
}

export async function guardarCodigoSeguridad(codigo) {
  const hash = await hashCodigo(codigo)

  if (!hash) {
    throw new Error('Debes ingresar un código de seguridad.')
  }

  localStorage.setItem(STORAGE_KEY, hash)
}

export function limpiarCodigoSeguridad() {
  localStorage.removeItem(STORAGE_KEY)
}

export async function verificarCodigoSeguridad(codigo) {
  const hashGuardado = localStorage.getItem(STORAGE_KEY)

  if (!hashGuardado) {
    return false
  }

  const hashIngresado = await hashCodigo(codigo)

  return Boolean(hashIngresado) && hashIngresado === hashGuardado
}