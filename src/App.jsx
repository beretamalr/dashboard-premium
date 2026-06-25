import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './firebase/firebaseConfig';

// Páginas y componentes
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Usuarios from './pages/Usuarios';
import Ventas from './pages/Ventas';
import Configuracion from './pages/Configuracion';
import Sidebar from './components/Sidebar';

const RutaProtegida = ({ children, darkMode, setDarkMode }) => {
  const [usuarioActivo, setUsuarioActivo] = useState(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUsuarioActivo(user);
      setCargando(false);
    });
    return () => unsubscribe();
  }, []);

  if (cargando) {
    return (
      <div className={`min-h-screen flex items-center justify-center font-medium ${darkMode ? 'bg-[#070a13] text-white' : 'bg-slate-50 text-slate-900'}`}>
        Cargando sistema...
      </div>
    );
  }
  
  if (!usuarioActivo) return <Navigate to="/" />;

  // CORRECCIÓN AQUÍ: Clases dinámicas según si darkMode es true o false
  return (
    <div className={`flex h-screen w-full overflow-hidden transition-colors duration-200 ${
      darkMode ? 'bg-[#070a13] text-slate-100' : 'bg-slate-50 text-slate-800'
    }`}>
      {/* Pasamos el estado al Sidebar para que controle el switch */}
      <Sidebar darkMode={darkMode} setDarkMode={setDarkMode} />
      
      <main className="flex-1 h-full overflow-y-auto p-8">
        {children}
      </main>
    </div>
  );
};

export default function App() {
  // Inicializamos leyendo el almacenamiento del navegador o por defecto oscuro
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem("theme");
    return saved ? saved === "dark" : true;
  });

  // Guardamos la preferencia cada vez que cambie
  useEffect(() => {
    localStorage.setItem("theme", darkMode ? "dark" : "light");
  }, [darkMode]);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />

        <Route path="/dashboard" element={
          <RutaProtegida darkMode={darkMode} setDarkMode={setDarkMode}>
            <Dashboard darkMode={darkMode} />
          </RutaProtegida>
        } />
        
        <Route path="/usuarios" element={
          <RutaProtegida darkMode={darkMode} setDarkMode={setDarkMode}>
            <Usuarios darkMode={darkMode} />
          </RutaProtegida>
        } />

        <Route path="/ventas" element={
          <RutaProtegida darkMode={darkMode} setDarkMode={setDarkMode}>
            <Ventas darkMode={darkMode} />
          </RutaProtegida>
        } />

        <Route path="/configuracion" element={
          <RutaProtegida darkMode={darkMode} setDarkMode={setDarkMode}>
            <Configuracion darkMode={darkMode} />
          </RutaProtegida>
        } />

        <Route path="*" element={<Navigate to="/dashboard" />} />
      </Routes>
    </BrowserRouter>
  );
}