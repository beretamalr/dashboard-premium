import React, { useState } from 'react';
import { User, Shield, Bell, Mail, Save } from 'lucide-react';

export default function Configuracion({ darkMode }) {
  const [formData, setFormData] = useState({
    nombreCompleto: 'Benjamin Beret',
    rolAsignado: 'Editor',
    correoElectronico: 'benja@ejemplo.com'
  });

  const [activeTab, setActiveTab] = useState('perfil');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = (e) => {
    e.preventDefault();
    // Aquí puedes conectar tu lógica con Firebase Firestore o Auth si lo requieres
    console.log("Cambios preparados para guardar:", formData);
  };

  return (
    <div className="p-8 w-full max-w-4xl mx-auto space-y-6">
      
      {/* Título y Subtítulo de la Página */}
      <div className="space-y-1">
        <h1 className={`text-2xl font-bold tracking-tight transition-colors duration-200 ${
          darkMode ? 'text-white' : 'text-slate-900'
        }`}>
          Configuración
        </h1>
        <p className={`text-sm transition-colors duration-200 ${
          darkMode ? 'text-slate-400' : 'text-slate-500'
        }`}>
          Gestiona las preferencias de tu cuenta, seguridad y entorno del sistema.
        </p>
      </div>

      {/* Navegación por Pestañas (Tabs) */}
      <div className={`flex gap-6 border-b transition-colors duration-200 ${
        darkMode ? 'border-slate-800' : 'border-slate-200'
      }`}>
        {[
          { id: 'perfil', label: 'Perfil', icon: User },
          { id: 'seguridad', label: 'Cuenta y Seguridad', icon: Shield },
          { id: 'notificaciones', label: 'Notificaciones', icon: Bell },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 pb-3 text-sm font-semibold border-b-2 transition-all duration-200 relative top-[2px] ${
                isActive
                  ? 'border-indigo-600 text-indigo-500'
                  : darkMode
                    ? 'border-transparent text-slate-400 hover:text-slate-200'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Icon size={16} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tarjeta Central del Formulario */}
      <div className={`border rounded-2xl p-6 shadow-sm transition-all duration-200 ${
        darkMode 
          ? 'bg-[#0f1524] border-slate-800/60 shadow-black/20' 
          : 'bg-white border-slate-200 shadow-slate-100'
      }`}>
        
        {activeTab === 'perfil' && (
          <form onSubmit={handleSave} className="space-y-6">
            <div>
              <h3 className={`text-base font-bold tracking-tight mb-4 transition-colors duration-200 ${
                darkMode ? 'text-white' : 'text-slate-900'
              }`}>
                Información Pública
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Input: Nombre Completo */}
              <div className="space-y-2">
                <label className={`text-xs font-bold uppercase tracking-wider block transition-colors duration-200 ${
                  darkMode ? 'text-slate-400' : 'text-slate-500'
                }`}>
                  Nombre Completo
                </label>
                <input
                  type="text"
                  name="nombreCompleto"
                  value={formData.nombreCompleto}
                  onChange={handleChange}
                  className={`w-full px-4 py-2.5 rounded-xl border text-sm font-medium transition-all outline-none focus:ring-2 focus:ring-indigo-500/20 ${
                    darkMode
                      ? 'bg-[#0a0f1d] border-slate-800 text-white focus:border-indigo-500'
                      : 'bg-white border-slate-200 text-slate-900 focus:border-indigo-600'
                  }`}
                />
              </div>

              {/* Input: Rol Asignado (Estilo de sólo lectura/protegido) */}
              <div className="space-y-2">
                <label className={`text-xs font-bold uppercase tracking-wider block transition-colors duration-200 ${
                  darkMode ? 'text-slate-400' : 'text-slate-500'
                }`}>
                  Rol Asignado
                </label>
                <input
                  type="text"
                  name="rolAsignado"
                  value={formData.rolAsignado}
                  readOnly
                  className={`w-full px-4 py-2.5 rounded-xl border text-sm font-medium transition-all outline-none cursor-not-allowed select-none ${
                    darkMode
                      ? 'bg-slate-900/40 border-slate-800/40 text-slate-500'
                      : 'bg-slate-50 border-slate-200 text-slate-400'
                  }`}
                />
              </div>

              {/* Input: Correo Electrónico */}
              <div className="space-y-2 md:col-span-2">
                <label className={`text-xs font-bold uppercase tracking-wider block transition-colors duration-200 ${
                  darkMode ? 'text-slate-400' : 'text-slate-500'
                }`}>
                  Correo Electrónico
                </label>
                <div className="relative">
                  <span className={`absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none transition-colors duration-200 ${
                    darkMode ? 'text-slate-500' : 'text-slate-400'
                  }`}>
                    <Mail size={16} />
                  </span>
                  <input
                    type="email"
                    name="correoElectronico"
                    value={formData.correoElectronico}
                    onChange={handleChange}
                    className={`w-full pl-11 pr-4 py-2.5 rounded-xl border text-sm font-medium transition-all outline-none focus:ring-2 focus:ring-indigo-500/20 ${
                      darkMode
                        ? 'bg-[#0a0f1d] border-slate-800 text-white focus:border-indigo-500'
                        : 'bg-white border-slate-200 text-slate-900 focus:border-indigo-600'
                    }`}
                  />
                </div>
              </div>
            </div>

            {/* Botón de Guardar Cambios */}
            <div className="flex justify-end pt-2">
              <button
                type="submit"
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold shadow-md shadow-indigo-600/10 transition-all active:scale-[0.98]"
              >
                <Save size={16} />
                Guardar Cambios
              </button>
            </div>
          </form>
        )}

        {/* Marcadores de posición para las otras pestañas */}
        {activeTab === 'seguridad' && (
          <div className={`text-sm py-4 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            Opciones de seguridad y cambio de contraseña.
          </div>
        )}

        {activeTab === 'notificaciones' && (
          <div className={`text-sm py-4 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            Preferencias de notificaciones del sistema.
          </div>
        )}

      </div>
    </div>
  );
}