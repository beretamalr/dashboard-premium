import React, { useEffect, useState } from 'react'
import { Bell, Mail, Save, Shield, User } from 'lucide-react'

import {
  guardarCodigoSeguridad,
  limpiarCodigoSeguridad,
  tieneCodigoSeguridad,
} from '../services/securityCode'

export default function Configuracion({ darkMode }) {
  const [formData, setFormData] = useState({
    nombreCompleto: 'Benjamin Beret',
    rolAsignado: 'Editor',
    correoElectronico: 'benja@ejemplo.com'
  })

  const [activeTab, setActiveTab] = useState('perfil')
  const [codigoSeguridad, setCodigoSeguridad] = useState('')
  const [confirmarCodigo, setConfirmarCodigo] = useState('')
  const [codigoConfigurado, setCodigoConfigurado] = useState(false)
  const [mensajeSeguridad, setMensajeSeguridad] = useState('')
  const [guardandoCodigo, setGuardandoCodigo] = useState(false)

  useEffect(() => {
    setCodigoConfigurado(tieneCodigoSeguridad())
  }, [])

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSave = (e) => {
    e.preventDefault()
    // Aquí puedes conectar tu lógica con Firebase Firestore o Auth si lo requieres
    console.log('Cambios preparados para guardar:', formData)
  }

  const handleSecuritySave = async (e) => {
    e.preventDefault()
    setMensajeSeguridad('')

    const codigoLimpio = codigoSeguridad.trim()
    const confirmarLimpio = confirmarCodigo.trim()

    if (codigoLimpio.length < 4) {
      setMensajeSeguridad('El código debe tener al menos 4 caracteres.')
      return
    }

    if (codigoLimpio !== confirmarLimpio) {
      setMensajeSeguridad('Los códigos no coinciden.')
      return
    }

    try {
      setGuardandoCodigo(true)
      await guardarCodigoSeguridad(codigoLimpio)
      setCodigoConfigurado(true)
      setMensajeSeguridad('Código de seguridad guardado correctamente.')
      setCodigoSeguridad('')
      setConfirmarCodigo('')
    } catch (error) {
      console.error(error)
      setMensajeSeguridad(error.message || 'No se pudo guardar el código.')
    } finally {
      setGuardandoCodigo(false)
    }
  }

  const handleEliminarCodigo = () => {
    limpiarCodigoSeguridad()
    setCodigoConfigurado(false)
    setCodigoSeguridad('')
    setConfirmarCodigo('')
    setMensajeSeguridad('Código de seguridad eliminado.')
  }

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 p-8">
      
      {/* Título y Subtítulo de la Página */}
      <div className="space-y-1">
        <h1
          className={`text-2xl font-bold tracking-tight transition-colors duration-200 ${
            darkMode ? 'text-white' : 'text-slate-900'
          }`}
        >
          Configuración
        </h1>
        <p
          className={`text-sm transition-colors duration-200 ${
            darkMode ? 'text-slate-400' : 'text-slate-500'
          }`}
        >
          Gestiona las preferencias de tu cuenta, seguridad y entorno del sistema.
        </p>
      </div>

      {/* Navegación por Pestañas (Tabs) */}
      <div
        className={`flex gap-6 border-b transition-colors duration-200 ${
          darkMode ? 'border-slate-800' : 'border-slate-200'
        }`}
      >
        {[
          { id: 'perfil', label: 'Perfil', icon: User },
          { id: 'seguridad', label: 'Cuenta y Seguridad', icon: Shield },
          { id: 'notificaciones', label: 'Notificaciones', icon: Bell },
        ].map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`relative top-0.5 flex items-center gap-2 border-b-2 pb-3 text-sm font-semibold transition-all duration-200 ${
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
          )
        })
      </div>

      {/* Tarjeta Central del Formulario */}
      <div
        className={`rounded-2xl border p-6 shadow-sm transition-all duration-200 ${
          darkMode
          ? 'border-slate-800/60 bg-[#0f1524] shadow-black/20'
          : 'bg-white border-slate-200 shadow-slate-100'
        }`}
      >
        
        {activeTab === 'perfil' && (
          <form onSubmit={handleSave} className="space-y-6">
            <div>
              <h3
                className={`mb-4 text-base font-bold tracking-tight transition-colors duration-200 ${
                  darkMode ? 'text-white' : 'text-slate-900'
                }`}
              >
                Información Pública
              </h3>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              
              {/* Input: Nombre Completo */}
              <div className="space-y-2">
                <label
                  className={`block text-xs font-bold uppercase tracking-wider transition-colors duration-200 ${
                    darkMode ? 'text-slate-400' : 'text-slate-500'
                  }`}
                >
                  Nombre Completo
                </label>
                <input
                  type="text"
                  name="nombreCompleto"
                  value={formData.nombreCompleto}
                  onChange={handleChange}
                  className={`w-full rounded-xl border px-4 py-2.5 text-sm font-medium transition-all outline-none focus:ring-2 focus:ring-indigo-500/20 ${
                    darkMode
                      ? 'bg-[#0a0f1d] border-slate-800 text-white focus:border-indigo-500'
                      : 'bg-white border-slate-200 text-slate-900 focus:border-indigo-600'
                  }`}
                />
              </div>

              {/* Input: Rol Asignado (Estilo de sólo lectura/protegido) */}
              <div className="space-y-2">
                <label
                  className={`block text-xs font-bold uppercase tracking-wider transition-colors duration-200 ${
                    darkMode ? 'text-slate-400' : 'text-slate-500'
                  }`}
                >
                  Rol Asignado
                </label>
                <input
                  type="text"
                  name="rolAsignado"
                  value={formData.rolAsignado}
                  readOnly
                  className={`w-full cursor-not-allowed select-none rounded-xl border px-4 py-2.5 text-sm font-medium transition-all outline-none ${
                    darkMode
                      ? 'bg-slate-900/40 border-slate-800/40 text-slate-500'
                      : 'bg-slate-50 border-slate-200 text-slate-400'
                  }`}
                />
              </div>

              {/* Input: Correo Electrónico */}
              <div className="space-y-2 md:col-span-2">
                <label
                  className={`block text-xs font-bold uppercase tracking-wider transition-colors duration-200 ${
                    darkMode ? 'text-slate-400' : 'text-slate-500'
                  }`}
                >
                  Correo Electrónico
                </label>
                <div className="relative">
                  <span
                    className={`absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none transition-colors duration-200 ${
                      darkMode ? 'text-slate-500' : 'text-slate-400'
                    }`}
                  >
                    <Mail size={16} />
                  </span>
                  <input
                    type="email"
                    name="correoElectronico"
                    value={formData.correoElectronico}
                    onChange={handleChange}
                    className={`w-full rounded-xl border py-2.5 pl-11 pr-4 text-sm font-medium transition-all outline-none focus:ring-2 focus:ring-indigo-500/20 ${
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
          <form onSubmit={handleSecuritySave} className="space-y-5 py-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className={`text-base font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                  Código de seguridad
                </h3>
                <p className={`mt-1 text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  Este PIN se pedirá al agregar o editar productos y ventas.
                </p>
              </div>

              <span className={`rounded-full px-3 py-1 text-xs font-semibold ring-1 ${
                codigoConfigurado
                  ? 'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:ring-emerald-900/70'
                  : 'bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-950/30 dark:text-amber-300 dark:ring-amber-900/70'
              }`}>
                {codigoConfigurado ? 'Activo' : 'Pendiente'}
              </span>
            </div>

            {mensajeSeguridad && (
              <div className={`rounded-xl border px-4 py-3 text-sm ${
                codigoConfigurado
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/70 dark:bg-emerald-950/20 dark:text-emerald-300'
                  : 'border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-900/70 dark:bg-indigo-950/20 dark:text-indigo-200'
              }`}>
                {mensajeSeguridad}
              </div>
            )}

            <div className="grid gap-4 md:grid-cols-2">
              <label className="block">
                <span className={`mb-1.5 block text-sm font-medium ${darkMode ? 'text-slate-200' : 'text-slate-700'}`}>
                  Nuevo código
                </span>
                <input
                  type="password"
                  value={codigoSeguridad}
                  onChange={(event) => setCodigoSeguridad(event.target.value)}
                  placeholder="Escribe un PIN o código"
                  className={`w-full rounded-xl border px-4 py-2.5 text-sm outline-none focus:border-indigo-500 ${
                    darkMode
                      ? 'border-slate-700 bg-slate-900 text-white'
                      : 'border-slate-200 bg-white text-slate-900'
                  }`}
                />
              </label>

              <label className="block">
                <span className={`mb-1.5 block text-sm font-medium ${darkMode ? 'text-slate-200' : 'text-slate-700'}`}>
                  Confirmar código
                </span>
                <input
                  type="password"
                  value={confirmarCodigo}
                  onChange={(event) => setConfirmarCodigo(event.target.value)}
                  placeholder="Repite el código"
                  className={`w-full rounded-xl border px-4 py-2.5 text-sm outline-none focus:border-indigo-500 ${
                    darkMode
                      ? 'border-slate-700 bg-slate-900 text-white'
                      : 'border-slate-200 bg-white text-slate-900'
                  }`}
                />
              </label>
            </div>

            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
              <button
                type="button"
                onClick={handleEliminarCodigo}
                className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
                  darkMode
                    ? 'text-slate-300 hover:bg-slate-800'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                Eliminar código
              </button>

              <button
                type="submit"
                disabled={guardandoCodigo}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-60"
              >
                <Save size={16} />
                {guardandoCodigo ? 'Guardando...' : 'Guardar código'}
              </button>
            </div>
          </form>
        )}

        {activeTab === 'notificaciones' && (
          <div className={`py-4 text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            Preferencias de notificaciones del sistema.
          </div>
        )}

      </div>
    </div>
  )
}