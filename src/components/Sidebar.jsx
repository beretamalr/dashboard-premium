import { Link, useLocation, useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase/firebaseConfig';
import { 
  LayoutDashboard, 
  Users, 
  ShoppingBag, 
  Settings, 
  LogOut, 
  Sun, 
  Moon 
} from 'lucide-react';

export default function Sidebar({ darkMode, setDarkMode }) {
  const location = useLocation();
  const navigate = useNavigate();

  const handleCerrarSesion = async () => {
    try {
      await signOut(auth);
      localStorage.removeItem('empresaId');
      navigate('/');
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
    }
  };

  // Listado de rutas del menú lateral
  const menuItems = [
    { path: '/dashboard', name: 'Dashboard', icon: LayoutDashboard },
    { path: '/usuarios', name: 'Gestión de Usuarios', icon: Users },
    { path: '/ventas', name: 'Historial de Ventas', icon: ShoppingBag },
    { path: '/configuracion', name: 'Configuración', icon: Settings },
  ];

  return (
    <aside className={`w-64 h-full border-r flex flex-col justify-between p-6 transition-colors duration-200 ${
      darkMode 
        ? 'bg-[#0f1524] border-slate-800/60 text-slate-300' 
        : 'bg-white border-slate-200 text-slate-600'
    }`}>
      
      {/* Sección Superior: Logotipo o Nombre del SaaS */}
      <div className="space-y-8">
        <div className="flex items-center gap-3 px-2">
          <div className="bg-indigo-600 text-white p-2 rounded-lg font-bold text-lg shadow-sm tracking-wider">
            NX
          </div>
          <div>
            <h2 className={`font-bold text-lg tracking-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>
              Nexus Panel
            </h2>
            <p className="text-[11px] text-slate-400 font-medium tracking-wide uppercase">Control Central</p>
          </div>
        </div>

        {/* Menú de Navegación */}
        <nav className="space-y-1.5">
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;

            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-150 ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/10'
                    : darkMode
                      ? 'hover:bg-slate-800/50 hover:text-white text-slate-400'
                      : 'hover:bg-slate-50 hover:text-slate-900 text-slate-500'
                }`}
              >
                <Icon size={18} className={isActive ? 'text-white' : 'text-current'} />
                {item.name}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Sección Inferior: Configuración de Tema y Cerrar Sesión */}
      <div className={`space-y-4 pt-4 border-t ${darkMode ? 'border-slate-800/60' : 'border-slate-100'}`}>
        
        {/* Switch de Modo Oscuro Controlado Fielmente */}
        <div className={`flex items-center justify-between p-3 rounded-xl border transition-colors ${
          darkMode ? 'bg-[#0a0f1d]/40 border-slate-800/60' : 'bg-slate-50 border-slate-200'
        }`}>
          <div className="flex items-center gap-2">
            {darkMode ? (
              <Moon size={16} className="text-indigo-400" />
            ) : (
              <Sun size={16} className="text-amber-500" />
            )}
            <span className="text-xs font-semibold select-none">
              {darkMode ? 'Modo Oscuro' : 'Modo Claro'}
            </span>
          </div>

          {/* Input Toggle Corregido */}
          <label className="relative inline-flex items-center cursor-pointer">
            <input 
              type="checkbox" 
              checked={darkMode} // Vinculado directamente al estado verdadero
              onChange={() => setDarkMode(!darkMode)} // Invierte el estado global correctamente
              className="sr-only peer" 
            />
            <div className="w-9 h-5 bg-slate-300 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
          </label>
        </div>

        {/* Botón de Cerrar Sesión */}
        <button
          onClick={handleCerrarSesion}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-colors ${
            darkMode 
              ? 'text-rose-400 hover:bg-rose-500/10' 
              : 'text-rose-600 hover:bg-rose-50'
          }`}
        >
          <LogOut size={18} />
          Cerrar Sesión
        </button>
      </div>

    </aside>
  );
}