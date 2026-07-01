import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  createUserWithEmailAndPassword,
  getRedirectResult,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  updateProfile,
} from 'firebase/auth'
import { ArrowRight, LockKeyhole, Mail, User } from 'lucide-react'

import { auth } from '../firebase/firebaseConfig'
import {
  esCorreoAutorizado,
  limpiarSesionLocal,
  prepararSesion,
} from '../services/authService'
import logo from '../img/Logo.png'

function mensajeError(error) {
  const mensajes = {
    'auth/invalid-credential': 'Correo o contraseña incorrectos.',
    'auth/invalid-email': 'Ingresa un correo electrónico válido.',
    'auth/user-disabled': 'Esta cuenta está deshabilitada.',
    'auth/too-many-requests': 'Demasiados intentos. Espera unos minutos.',
    'auth/popup-closed-by-user':
      'Se cerró la ventana de acceso con Google.',
    'auth/popup-blocked':
      'El navegador bloqueó la ventana de Google.',
  }

  return (
    mensajes[error?.code] ||
    error?.message ||
    'No fue posible iniciar sesión.'
  )
}

function IconoGoogle() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5">
      <path
        fill="#4285F4"
        d="M21.8 12.23c0-.71-.06-1.4-.19-2.05H12v3.88h5.49a4.7 4.7 0 0 1-2.04 3.08v2.51h3.32c1.94-1.79 3.03-4.42 3.03-7.42Z"
      />
      <path
        fill="#34A853"
        d="M12 22c2.75 0 5.06-.91 6.75-2.35l-3.32-2.51c-.92.62-2.1.99-3.43.99-2.64 0-4.87-1.78-5.67-4.18H2.9v2.59A10.19 10.19 0 0 0 12 22Z"
      />
      <path
        fill="#FBBC05"
        d="M6.33 13.95A6.15 6.15 0 0 1 6 12c0-.68.12-1.34.33-1.95V7.46H2.9A10.01 10.01 0 0 0 1.8 12c0 1.61.39 3.14 1.1 4.54l3.43-2.59Z"
      />
      <path
        fill="#EA4335"
        d="M12 5.87c1.5 0 2.84.52 3.9 1.54l2.92-2.92C17.05 2.84 14.75 2 12 2a10.19 10.19 0 0 0-9.1 5.46l3.43 2.59C7.13 7.65 9.36 5.87 12 5.87Z"
      />
    </svg>
  )
}

export default function Registro() {
  const [nombre, setNombre] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [revisandoRedireccion, setRevisandoRedireccion] = useState(true)

  const navigate = useNavigate()

  const terminarAcceso = async (usuario) => {
    if (!esCorreoAutorizado(usuario?.email)) {
      limpiarSesionLocal()
      await signOut(auth)

      throw new Error('Esta cuenta no está autorizada para acceder al panel.')
    }

    await prepararSesion(usuario)
    navigate('/dashboard', { replace: true })
  }

  useEffect(() => {
    let activo = true

    const recuperarGoogle = async () => {
      try {
        const resultado = await getRedirectResult(auth)

        if (resultado?.user && activo) {
          await terminarAcceso(resultado.user)
        }
      } catch (errorGoogle) {
        if (activo) {
          setError(mensajeError(errorGoogle))
        }
      } finally {
        if (activo) {
          setRevisandoRedireccion(false)
        }
      }
    }

    recuperarGoogle()

    return () => {
      activo = false
    }
  }, [])

  const registrarConCorreo = async (event) => {
    event.preventDefault()
    setError('')

    const correo = email.trim().toLowerCase()
    const nombreLimpio = nombre.trim()

    if (!esCorreoAutorizado(correo)) {
      setError('Este correo no está autorizado para acceder al panel.')
      return
    }

    if (!nombreLimpio) {
      setError('Ingresa tu nombre para crear la cuenta.')
      return
    }

    try {
      setLoading(true)

      const credenciales = await createUserWithEmailAndPassword(auth, correo, password)

      await updateProfile(credenciales.user, {
        displayName: nombreLimpio,
      })

      await terminarAcceso(credenciales.user)
    } catch (errorLogin) {
      limpiarSesionLocal()
      setError(mensajeError(errorLogin))
    } finally {
      setLoading(false)
    }
  }

  const crearConGoogle = async () => {
    setError('')
    setLoading(true)

    try {
      const proveedor = new GoogleAuthProvider()

      proveedor.setCustomParameters({
        prompt: 'select_account',
      })

      if (window.matchMedia('(max-width: 767px)').matches) {
        await signInWithRedirect(auth, proveedor)
        return
      }

      const resultado = await signInWithPopup(auth, proveedor)

      await terminarAcceso(resultado.user)
    } catch (errorGoogle) {
      limpiarSesionLocal()
      setError(mensajeError(errorGoogle))

      if (auth.currentUser) {
        await signOut(auth)
      }
    } finally {
      setLoading(false)
    }
  }

  const bloqueado = loading || revisandoRedireccion

  return (
    <main className="relative grid min-h-screen overflow-hidden bg-slate-950 px-4 py-8 lg:place-items-center">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(79,70,229,0.25),transparent_36%),radial-gradient(circle_at_bottom_right,rgba(14,165,233,0.14),transparent_32%)]" />

      <section className="relative my-auto w-full max-w-md rounded-3xl border border-white/10 bg-slate-900/90 p-6 shadow-2xl shadow-black/30 backdrop-blur sm:p-8">
        <div className="mb-8 text-center">
          <img
            src={logo}
            alt="B&K Fusión Tech"
            className="mx-auto mb-5 h-16 w-auto object-contain"
          />

          <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-indigo-400">
            B&K Fusión Tech
          </p>

          <h1 className="text-2xl font-bold text-white">
            Crea tu cuenta
          </h1>

          <p className="mt-2 text-sm text-slate-400">
            Solo usuarios autorizados pueden acceder al panel.
          </p>
        </div>

        {error && (
          <div className="mb-5 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-3 text-sm text-rose-200">
            {error}
          </div>
        )}

        <form onSubmit={registrarConCorreo} className="space-y-4">
          <label className="block">
            <span className="mb-1.5 flex items-center gap-2 text-sm font-medium text-slate-300">
              <User size={16} />
              Nombre
            </span>

            <input
              type="text"
              autoComplete="name"
              value={nombre}
              onChange={(event) => setNombre(event.target.value)}
              required
              placeholder="Tu nombre"
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-white outline-none placeholder:text-slate-600 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
            />
          </label>

          <label className="block">
            <span className="mb-1.5 flex items-center gap-2 text-sm font-medium text-slate-300">
              <Mail size={16} />
              Correo electrónico
            </span>

            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              placeholder="correo@ejemplo.cl"
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-white outline-none placeholder:text-slate-600 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
            />
          </label>

          <label className="block">
            <span className="mb-1.5 flex items-center gap-2 text-sm font-medium text-slate-300">
              <LockKeyhole size={16} />
              Contraseña
            </span>

            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              placeholder="Ingresa tu contraseña"
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-white outline-none placeholder:text-slate-600 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
            />
          </label>

          <button
            type="submit"
            disabled={bloqueado}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 font-semibold text-white shadow-lg shadow-indigo-600/20 transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? 'Creando cuenta...' : 'Crear cuenta'}
            {!loading && <ArrowRight size={18} />}
          </button>
        </form>

        <div className="my-6 flex items-center gap-3 text-xs text-slate-500">
          <span className="h-px flex-1 bg-slate-800" />
          o con Google
          <span className="h-px flex-1 bg-slate-800" />
        </div>

        <button
          type="button"
          onClick={crearConGoogle}
          disabled={bloqueado}
          className="flex w-full items-center justify-center gap-3 rounded-xl border border-slate-700 bg-white px-4 py-3 text-sm font-semibold text-slate-800 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <IconoGoogle />
          {loading ? 'Procesando alta...' : 'Continuar con Google'}
        </button>

        <p className="mt-6 text-center text-sm text-slate-400">
          ¿Ya tienes una cuenta?{' '}
          <Link
            to="/"
            className="font-semibold text-indigo-400 hover:text-indigo-300"
          >
            Inicia sesión
          </Link>
        </p>
      </section>
    </main>
  )
}