import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { onAuthStateChanged } from 'firebase/auth'

import { auth } from './firebase/firebaseConfig'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Ventas from './pages/Ventas'
import Inventario from './pages/Inventario'
import Sidebar from './components/Sidebar'

function RutaProtegida({ children, darkMode, setDarkMode }) {
  const [usuarioActivo, setUsuarioActivo] = useState(null)
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    const cancelar = onAuthStateChanged(auth, (usuario) => {
      setUsuarioActivo(usuario)
      setCargando(false)
    })

    return cancelar
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

  if (!usuarioActivo) {
    return <Navigate to="/" replace />
  }

  return (
    <div className={darkMode ? 'dark' : ''}>
      <div className="min-h-screen bg-slate-50 text-slate-900 transition-colors dark:bg-slate-950 dark:text-slate-100">
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

  const protegerRuta = (pagina) => (
    <RutaProtegida darkMode={darkMode} setDarkMode={setDarkMode}>
      {pagina}
    </RutaProtegida>
  )

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/dashboard" element={protegerRuta(<Dashboard />)} />
        <Route path="/ventas" element={protegerRuta(<Ventas />)} />
        <Route path="/inventario" element={protegerRuta(<Inventario />)} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  )
}