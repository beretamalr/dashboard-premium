
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { signOut } from 'firebase/auth'
import {
  Boxes,
  LayoutDashboard,
  LogOut,
  Moon,
  ShoppingBag,
  Sun,
} from 'lucide-react'

import { auth } from '../firebase/firebaseConfig'
import { limpiarSesionLocal } from '../services/authService'

export default function Sidebar({ darkMode, setDarkMode }) {
  const location = useLocation()
  const navigate = useNavigate()

  const menuItems = [
    {
      path: '/dashboard',
      name: 'Resumen',
      icon: LayoutDashboard,
    },
    {
      path: '/ventas',
      name: 'Ventas',
      icon: ShoppingBag,
    },
    {
      path: '/inventario',
      name: 'Inventario',
      icon: Boxes,
    },
  ]

  const cerrarSesion = async () => {
    limpiarSesionLocal()
    await signOut(auth)
    navigate('/', { replace: true })
  }

  return (
    <aside className="border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-[#0d1321] lg:fixed lg:inset-y-0 lg:left-0 lg:z-50 lg:w-72 lg:border-b-0 lg:border-r">
      <div className="flex h-full flex-col px-4 py-4 lg:p-6">
        <Link to="/dashboard" className="mb-5 flex items-center gap-3 lg:mb-8">
          <img src="src\img\marcaagua.png" alt="Logo" />
        </Link>

        <nav className="flex gap-2 overflow-x-auto pb-1 lg:block lg:space-y-2 lg:overflow-visible">
          {menuItems.map((item) => {
            const Icono = item.icon
            const activo = location.pathname === item.path

            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex shrink-0 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                  activo
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white'
                }`}
              >
                <Icono size={18} />
                {item.name}
              </Link>
            )
          })}
        </nav>

        <div className="mt-4 flex items-center gap-2 border-t border-slate-200 pt-4 dark:border-slate-800 lg:mt-auto lg:block lg:space-y-2">
          <button
            type="button"
            onClick={() => setDarkMode(!darkMode)}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800 lg:w-full"
          >
            {darkMode ? <Sun size={17} /> : <Moon size={17} />}
            {darkMode ? 'Modo claro' : 'Modo oscuro'}
          </button>

          <button
            type="button"
            onClick={cerrarSesion}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium text-rose-600 transition hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/30 lg:w-full"
          >
            <LogOut size={17} />
            Salir
          </button>
        </div>
      </div>
    </aside>
  )
}