
import { useEffect, useState } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { onAuthStateChanged, signOut } from 'firebase/auth'

import { auth } from './firebase/firebaseConfig'
import {
  limpiarSesionLocal,
  esCorreoAutorizado,
  prepararSesion,
} from './services/authService'

import Sidebar from './components/Sidebar'
import Dashboard from './pages/Dashboard'
import Inventario from './pages/Inventario'
import Login from './pages/Login'
import Registro from './pages/Registro'
import Ventas from './pages/Ventas'


function RutaProtegida({ children, darkMode, setDarkMode }) {
  const [cargando, setCargando] = useState(true)
  const [permitido, setPermitido] = useState(false)

  useEffect(() => {
    let activo = true

    const cancelar = onAuthStateChanged(auth, async (usuario) => {
      if (!usuario || !esCorreoAutorizado(usuario.email)) {
        limpiarSesionLocal()

        if (usuario) {
          await signOut(auth)
        }

        if (activo) {
          setPermitido(false)
          setCargando(false)
        }

        return
      }

      try {
        await prepararSesion(usuario)

        if (activo) {
          setPermitido(true)
        }
      } catch (error) {
        console.error('No se pudo preparar la sesión:', error)

        limpiarSesionLocal()
        await signOut(auth)

        if (activo) {
          setPermitido(false)
        }
      } finally {
        if (activo) {
          setCargando(false)
        }
      }
    })

    return () => {
      activo = false
      cancelar()
    }
  }, [])

  if (cargando) {
    return (
      <div className="grid min-h-screen place-items-center bg-slate-950 text-slate-200">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
          <p className="font-medium">Cargando sistema...</p>
        </div>
      </div>
    )
  }

  if (!permitido) {
    return <Navigate to="/" replace />
  }

  return (
    <div className={darkMode ? 'dark' : ''}>
      <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
        <Sidebar darkMode={darkMode} setDarkMode={setDarkMode} />

        <main className="min-h-screen p-4 sm:p-6 lg:ml-72 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  )
}

export default function App() {
  const [darkMode, setDarkMode] = useState(() => {
    const temaGuardado = localStorage.getItem('theme')

    return temaGuardado ? temaGuardado === 'dark' : true
  })

  useEffect(() => {
    localStorage.setItem('theme', darkMode ? 'dark' : 'light')
  }, [darkMode])

  const proteger = (pagina) => (
    <RutaProtegida darkMode={darkMode} setDarkMode={setDarkMode}>
      {pagina}
    </RutaProtegida>
  )

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/registro" element={<Registro />} />
        <Route path="/dashboard" element={proteger(<Dashboard />)} />
        <Route path="/ventas" element={proteger(<Ventas />)} />
        <Route path="/inventario" element={proteger(<Inventario />)} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  )
}