import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore'

import { db } from '../firebase/firebaseConfig'

export const CORREOS_AUTORIZADOS = [
  'be.retamalr@gmail.com',
  '782263711ks@gmail.com',
]

function normalizarCorreo(correo) {
  return String(correo || '').trim().toLowerCase()
}

export function esCorreoAutorizado(correo) {
  return CORREOS_AUTORIZADOS.includes(normalizarCorreo(correo))
}

function obtenerNombre(usuario) {
  const nombreGoogle = String(usuario?.displayName || '').trim()

  if (nombreGoogle) return nombreGoogle

  const correo = normalizarCorreo(usuario?.email)

  return correo ? correo.split('@')[0] : 'Usuario'
}

function obtenerProveedor(usuario) {
  return usuario?.providerData?.[0]?.providerId || 'password'
}

export async function prepararSesion(usuario) {
  if (!usuario?.uid || !usuario?.email) {
    throw new Error('No fue posible identificar la cuenta autenticada.')
  }

  const email = normalizarCorreo(usuario.email)

  if (!esCorreoAutorizado(email)) {
    throw new Error('Esta cuenta no está autorizada para acceder al panel.')
  }

  const perfilRef = doc(db, 'usuarios', usuario.uid)
  const perfilSnapshot = await getDoc(perfilRef)
  const datosExistentes = perfilSnapshot.exists()
    ? perfilSnapshot.data()
    : {}

  const perfil = {
    uid: usuario.uid,
    nombre: datosExistentes.nombre || obtenerNombre(usuario),
    email,
    rol: datosExistentes.rol || 'administrador',
    activo: datosExistentes.activo !== false,
    proveedorAuth: obtenerProveedor(usuario),
  }

  await setDoc(
    perfilRef,
    {
      ...perfil,
      createdAt: datosExistentes.createdAt || serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  )

  localStorage.setItem('sesionPymeActiva', 'true')
  localStorage.setItem('rol', perfil.rol)
  localStorage.setItem('usuarioNombre', perfil.nombre)
  localStorage.setItem('usuarioEmail', perfil.email)

  return perfil
}

export function limpiarSesionLocal() {
  localStorage.removeItem('sesionPymeActiva')
  localStorage.removeItem('rol')
  localStorage.removeItem('usuarioNombre')
  localStorage.removeItem('usuarioEmail')
  localStorage.removeItem('empresaId')
}