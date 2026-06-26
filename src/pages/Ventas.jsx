import { useEffect, useMemo, useState } from 'react'
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore'
import {
  CalendarDays,
  CircleAlert,
  LoaderCircle,
  Pencil,
  Plus,
  Search,
  ShoppingBag,
  Trash2,
  UserRound,
  X,
} from 'lucide-react'

import { auth, db } from '../firebase/firebaseConfig'

const formatoCLP = new Intl.NumberFormat('es-CL', {
  style: 'currency',
  currency: 'CLP',
  maximumFractionDigits: 0,
})

const categorias = [
  'Cargadores',
  'Audífonos',
  'Cables',
  'Accesorios',
  'Servicios',
  'Otros',
]

const estados = ['Completada', 'Pendiente', 'Anulada']

function fechaHoy() {
  const fecha = new Date()
  const anio = fecha.getFullYear()
  const mes = String(fecha.getMonth() + 1).padStart(2, '0')
  const dia = String(fecha.getDate()).padStart(2, '0')

  return `${anio}-${mes}-${dia}`
}

function fechaISO(fecha) {
  const anio = fecha.getFullYear()
  const mes = String(fecha.getMonth() + 1).padStart(2, '0')
  const dia = String(fecha.getDate()).padStart(2, '0')

  return `${anio}-${mes}-${dia}`
}

function inicioSemanaActual() {
  const hoy = new Date()
  const dia = hoy.getDay()
  const diferencia = dia === 0 ? -6 : 1 - dia
  const lunes = new Date(hoy)

  lunes.setDate(hoy.getDate() + diferencia)

  return fechaISO(lunes)
}

function crearFormularioInicial() {
  return {
    cliente: '',
    producto: '',
    categoria: 'Otros',
    monto: '',
    fecha: fechaHoy(),
    estado: 'Completada',
  }
}

function normalizarEstado(estado) {
  if (!estado) return 'Completada'

  if (estado === 'Completado') return 'Completada'
  if (estado === 'Pendiente') return 'Pendiente'
  if (estado === 'Anulado') return 'Anulada'

  return estado
}

function claseEstado(estado) {
  const estadoNormalizado = normalizarEstado(estado)

  if (estadoNormalizado === 'Completada') {
    return 'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:ring-emerald-900/70'
  }

  if (estadoNormalizado === 'Pendiente') {
    return 'bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-950/30 dark:text-amber-300 dark:ring-amber-900/70'
  }

  return 'bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-950/30 dark:text-rose-300 dark:ring-rose-900/70'
}

export default function Ventas() {
  const [ventas, setVentas] = useState([])
  const [cargando, setCargando] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [modalAbierto, setModalAbierto] = useState(false)
  const [ventaEditando, setVentaEditando] = useState(null)
  const [guardando, setGuardando] = useState(false)
  const [mensaje, setMensaje] = useState(null)
  const [formulario, setFormulario] = useState(crearFormularioInicial)

  const [filtroFecha, setFiltroFecha] = useState('todas')
  const [fechaInicio, setFechaInicio] = useState('')
  const [fechaFin, setFechaFin] = useState('')

  useEffect(() => {
    const empresaId = localStorage.getItem('empresaId')

    if (!empresaId) {
      setMensaje({
        tipo: 'error',
        texto: 'No se encontró una empresa asociada a esta sesión.',
      })
      setCargando(false)
      return undefined
    }

    const consulta = query(
      collection(db, 'ventas'),
      where('empresaId', '==', empresaId),
    )

    const cancelar = onSnapshot(
      consulta,
      (snapshot) => {
        const listaVentas = snapshot.docs
          .map((documento) => ({
            id: documento.id,
            ...documento.data(),
            monto: Number(documento.data().monto) || 0,
            estado: normalizarEstado(documento.data().estado),
            categoria: documento.data().categoria || 'Otros',
          }))
          .sort((a, b) =>
            String(b.fecha || '').localeCompare(String(a.fecha || '')),
          )

        setVentas(listaVentas)
        setCargando(false)
      },
      (error) => {
        console.error('Error al cargar ventas:', error)

        setMensaje({
          tipo: 'error',
          texto:
            'No fue posible cargar las ventas. Revisa las reglas de Firestore.',
        })

        setCargando(false)
      },
    )

    return cancelar
  }, [])

  const ventasFiltradas = useMemo(() => {
    const hoy = fechaHoy()
    const inicioSemana = inicioSemanaActual()
    const mesActual = hoy.slice(0, 7)
    const termino = busqueda.trim().toLowerCase()

    return ventas.filter((venta) => {
      const fechaVenta = String(venta.fecha || '').slice(0, 10)

      let cumpleFecha = true

      if (filtroFecha === 'hoy') {
        cumpleFecha = fechaVenta === hoy
      }

      if (filtroFecha === 'semana') {
        cumpleFecha = fechaVenta >= inicioSemana && fechaVenta <= hoy
      }

      if (filtroFecha === 'mes') {
        cumpleFecha = fechaVenta.startsWith(mesActual)
      }

      if (filtroFecha === 'personalizado') {
        if (fechaInicio && fechaVenta < fechaInicio) {
          cumpleFecha = false
        }

        if (fechaFin && fechaVenta > fechaFin) {
          cumpleFecha = false
        }
      }

      if (!cumpleFecha) return false

      if (!termino) return true

      const datosBuscables = [
        venta.idTicket,
        venta.cliente,
        venta.producto,
        venta.categoria,
        venta.estado,
        venta.fecha,
      ]

      return datosBuscables
        .filter(Boolean)
        .some((dato) => String(dato).toLowerCase().includes(termino))
    })
  }, [busqueda, fechaFin, fechaInicio, filtroFecha, ventas])

  const resumenFiltro = useMemo(() => {
    const ventasValidas = ventasFiltradas.filter(
      (venta) => normalizarEstado(venta.estado) !== 'Anulada',
    )

    const total = ventasValidas.reduce(
      (acumulado, venta) => acumulado + venta.monto,
      0,
    )

    const anuladas = ventasFiltradas.filter(
      (venta) => normalizarEstado(venta.estado) === 'Anulada',
    ).length

    return {
      total,
      operaciones: ventasValidas.length,
      anuladas,
    }
  }, [ventasFiltradas])

  const abrirModalCrear = () => {
    setFormulario(crearFormularioInicial())
    setVentaEditando(null)
    setMensaje(null)
    setModalAbierto(true)
  }

  const abrirModalEditar = (venta) => {
    setFormulario({
      cliente: venta.cliente || '',
      producto: venta.producto || '',
      categoria: venta.categoria || 'Otros',
      monto: String(venta.monto || ''),
      fecha: venta.fecha || fechaHoy(),
      estado: normalizarEstado(venta.estado),
    })

    setVentaEditando(venta)
    setMensaje(null)
    setModalAbierto(true)
  }

  const cerrarModal = () => {
    if (!guardando) {
      setModalAbierto(false)
      setVentaEditando(null)
      setFormulario(crearFormularioInicial())
    }
  }

  const guardarVenta = async (event) => {
    event.preventDefault()
    setMensaje(null)

    const empresaId = localStorage.getItem('empresaId')
    const monto = Number(formulario.monto)

    if (!empresaId) {
      setMensaje({
        tipo: 'error',
        texto: 'La sesión no tiene una empresa válida.',
      })
      return
    }

    if (!formulario.producto.trim()) {
      setMensaje({
        tipo: 'error',
        texto: 'Debes indicar un producto o servicio.',
      })
      return
    }

    if (!formulario.categoria.trim()) {
      setMensaje({
        tipo: 'error',
        texto: 'Debes seleccionar una categoría.',
      })
      return
    }

    if (!Number.isFinite(monto) || monto <= 0) {
      setMensaje({
        tipo: 'error',
        texto: 'El monto debe ser mayor que cero.',
      })
      return
    }

    try {
      setGuardando(true)

      const datosVenta = {
        cliente: formulario.cliente.trim() || 'Consumidor final',
        producto: formulario.producto.trim(),
        categoria: formulario.categoria.trim(),
        monto,
        fecha: formulario.fecha,
        estado: formulario.estado,
      }

      if (ventaEditando) {
        await updateDoc(doc(db, 'ventas', ventaEditando.id), {
          ...datosVenta,
          updatedAt: serverTimestamp(),
          updatedBy: auth.currentUser?.uid || null,
        })

        setMensaje({
          tipo: 'ok',
          texto: 'Venta actualizada correctamente.',
        })
      } else {
        await addDoc(collection(db, 'ventas'), {
          empresaId,
          ...datosVenta,
          idTicket: `V-${Date.now().toString().slice(-6)}`,
          usuarioId: auth.currentUser?.uid || null,
          usuarioEmail: auth.currentUser?.email || null,
          createdAt: serverTimestamp(),
        })

        setMensaje({
          tipo: 'ok',
          texto: 'Venta registrada correctamente.',
        })
      }

      setFormulario(crearFormularioInicial())
      setVentaEditando(null)
      setModalAbierto(false)
    } catch (error) {
      console.error('Error al guardar venta:', error)

      setMensaje({
        tipo: 'error',
        texto:
          'No se pudo guardar la venta. Revisa la conexión y permisos de Firestore.',
      })
    } finally {
      setGuardando(false)
    }
  }

  const eliminarVenta = async (venta) => {
    const confirmar = window.confirm(
      `Se eliminará la venta ${venta.idTicket || venta.id}. Esta acción no se puede deshacer.`,
    )

    if (!confirmar) return

    try {
      await deleteDoc(doc(db, 'ventas', venta.id))

      setMensaje({
        tipo: 'ok',
        texto: 'Venta eliminada correctamente.',
      })
    } catch (error) {
      console.error('Error al eliminar venta:', error)

      setMensaje({
        tipo: 'error',
        texto: 'No fue posible eliminar la venta.',
      })
    }
  }

  return (
    <section className="mx-auto max-w-7xl">
      <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-2 text-sm font-semibold uppercase tracking-[0.18em] text-indigo-500">
            Operación comercial
          </p>

          <h1 className="text-3xl font-bold tracking-tight text-slate-950 dark:text-white">
            Ventas
          </h1>

          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Registra, edita, filtra y controla el estado de cada venta.
          </p>
        </div>

        <button
          type="button"
          onClick={abrirModalCrear}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-600/20 transition hover:bg-indigo-500"
        >
          <Plus size={18} />
          Registrar venta
        </button>
      </div>

      {mensaje && (
        <div
          className={`mb-5 flex items-start gap-3 rounded-xl border p-4 text-sm ${
            mensaje.tipo === 'ok'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/70 dark:bg-emerald-950/30 dark:text-emerald-300'
              : 'border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-900/70 dark:bg-rose-950/30 dark:text-rose-300'
          }`}
        >
          <CircleAlert size={18} className="mt-0.5 shrink-0" />
          <span>{mensaje.texto}</span>
        </div>
      )}

      <div className="mb-5 grid gap-4 sm:grid-cols-3">
        <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-[#0f1524]">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Total filtrado
          </p>
          <p className="mt-2 text-2xl font-bold text-slate-950 dark:text-white">
            {formatoCLP.format(resumenFiltro.total)}
          </p>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-[#0f1524]">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Operaciones válidas
          </p>
          <p className="mt-2 text-2xl font-bold text-slate-950 dark:text-white">
            {resumenFiltro.operaciones}
          </p>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-[#0f1524]">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Ventas anuladas
          </p>
          <p className="mt-2 text-2xl font-bold text-slate-950 dark:text-white">
            {resumenFiltro.anuladas}
          </p>
        </article>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-[#0f1524]">
        <div className="grid gap-4 border-b border-slate-200 p-4 dark:border-slate-800 lg:grid-cols-[1fr_auto] lg:items-end">
          <div className="grid gap-3 md:grid-cols-[1.2fr_0.8fr_0.8fr_0.8fr]">
            <div className="relative">
              <Search
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                value={busqueda}
                onChange={(event) => setBusqueda(event.target.value)}
                placeholder="Buscar cliente, producto, categoría o estado"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-indigo-500 focus:bg-white dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:focus:bg-slate-950"
              />
            </div>

            <select
              value={filtroFecha}
              onChange={(event) => setFiltroFecha(event.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none transition focus:border-indigo-500 focus:bg-white dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:focus:bg-slate-950"
            >
              <option value="todas">Todas las fechas</option>
              <option value="hoy">Hoy</option>
              <option value="semana">Esta semana</option>
              <option value="mes">Este mes</option>
              <option value="personalizado">Rango personalizado</option>
            </select>

            <input
              type="date"
              value={fechaInicio}
              disabled={filtroFecha !== 'personalizado'}
              onChange={(event) => setFechaInicio(event.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none transition focus:border-indigo-500 focus:bg-white disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:focus:bg-slate-950"
            />

            <input
              type="date"
              value={fechaFin}
              disabled={filtroFecha !== 'personalizado'}
              onChange={(event) => setFechaFin(event.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none transition focus:border-indigo-500 focus:bg-white disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:focus:bg-slate-950"
            />
          </div>

          <p className="text-sm text-slate-500 dark:text-slate-400">
            {ventasFiltradas.length}{' '}
            {ventasFiltradas.length === 1 ? 'registro' : 'registros'}
          </p>
        </div>

        {cargando ? (
          <div className="grid min-h-72 place-items-center p-8 text-slate-500 dark:text-slate-400">
            <div className="flex items-center gap-3">
              <LoaderCircle size={20} className="animate-spin" />
              Cargando ventas...
            </div>
          </div>
        ) : ventasFiltradas.length === 0 ? (
          <div className="grid min-h-72 place-items-center p-8 text-center">
            <div>
              <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-full bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300">
                <ShoppingBag size={22} />
              </div>

              <h2 className="font-semibold text-slate-900 dark:text-white">
                No hay ventas para mostrar
              </h2>

              <p className="mt-1 max-w-sm text-sm text-slate-500 dark:text-slate-400">
                Registra la primera venta para que el dashboard calcule métricas.
              </p>
            </div>
          </div>
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[980px] text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-900/50 dark:text-slate-400">
                  <tr>
                    <th className="px-5 py-4 font-semibold">Operación</th>
                    <th className="px-5 py-4 font-semibold">Cliente</th>
                    <th className="px-5 py-4 font-semibold">Producto</th>
                    <th className="px-5 py-4 font-semibold">Categoría</th>
                    <th className="px-5 py-4 font-semibold">Fecha</th>
                    <th className="px-5 py-4 font-semibold">Estado</th>
                    <th className="px-5 py-4 text-right font-semibold">
                      Monto
                    </th>
                    <th className="px-5 py-4 text-right font-semibold">
                      Acción
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {ventasFiltradas.map((venta) => (
                    <tr
                      key={venta.id}
                      className="transition hover:bg-slate-50/80 dark:hover:bg-slate-900/40"
                    >
                      <td className="px-5 py-4 font-mono text-xs text-slate-500 dark:text-slate-400">
                        {venta.idTicket || venta.id.slice(0, 8)}
                      </td>

                      <td className="px-5 py-4 font-medium text-slate-800 dark:text-slate-100">
                        {venta.cliente}
                      </td>

                      <td className="px-5 py-4 text-slate-600 dark:text-slate-300">
                        {venta.producto}
                      </td>

                      <td className="px-5 py-4 text-slate-500 dark:text-slate-400">
                        {venta.categoria}
                      </td>

                      <td className="px-5 py-4 text-slate-500 dark:text-slate-400">
                        {venta.fecha || 'Sin fecha'}
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${claseEstado(
                            venta.estado,
                          )}`}
                        >
                          {normalizarEstado(venta.estado)}
                        </span>
                      </td>

                      <td className="px-5 py-4 text-right font-semibold text-emerald-600 dark:text-emerald-400">
                        {formatoCLP.format(venta.monto)}
                      </td>

                      <td className="px-5 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => abrirModalEditar(venta)}
                            className="inline-flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-semibold text-indigo-600 transition hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-950/30"
                          >
                            <Pencil size={16} />
                            Editar
                          </button>

                          <button
                            type="button"
                            onClick={() => eliminarVenta(venta)}
                            className="inline-flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-semibold text-rose-600 transition hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/30"
                          >
                            <Trash2 size={16} />
                            Eliminar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="divide-y divide-slate-100 md:hidden dark:divide-slate-800">
              {ventasFiltradas.map((venta) => (
                <article key={venta.id} className="p-4">
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-900 dark:text-white">
                        {venta.producto}
                      </p>

                      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                        {venta.cliente}
                      </p>

                      <div className="mt-2 flex flex-wrap gap-2">
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                          {venta.categoria}
                        </span>

                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${claseEstado(
                            venta.estado,
                          )}`}
                        >
                          {normalizarEstado(venta.estado)}
                        </span>
                      </div>
                    </div>

                    <p className="font-bold text-emerald-600 dark:text-emerald-400">
                      {formatoCLP.format(venta.monto)}
                    </p>
                  </div>

                  <div className="flex items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
                    <span>{venta.fecha || 'Sin fecha'}</span>

                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => abrirModalEditar(venta)}
                        className="inline-flex items-center gap-1.5 font-semibold text-indigo-600 dark:text-indigo-400"
                      >
                        <Pencil size={14} />
                        Editar
                      </button>

                      <button
                        type="button"
                        onClick={() => eliminarVenta(venta)}
                        className="inline-flex items-center gap-1.5 font-semibold text-rose-600 dark:text-rose-400"
                      >
                        <Trash2 size={14} />
                        Eliminar
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </>
        )}
      </div>

      {modalAbierto && (
        <div className="fixed inset-0 z-[60] grid place-items-center bg-slate-950/70 p-4 backdrop-blur-sm">
          <form
            onSubmit={guardarVenta}
            className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-2xl dark:bg-[#111827] sm:p-6"
          >
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.15em] text-indigo-500">
                  {ventaEditando ? 'Editar operación' : 'Nueva operación'}
                </p>

                <h2 className="mt-1 text-xl font-bold text-slate-950 dark:text-white">
                  {ventaEditando ? 'Editar venta' : 'Registrar venta'}
                </h2>
              </div>

              <button
                type="button"
                onClick={cerrarModal}
                className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-950 dark:hover:bg-slate-800 dark:hover:text-white"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <label className="block">
                <span className="mb-1.5 flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
                  <UserRound size={16} />
                  Cliente
                </span>

                <input
                  value={formulario.cliente}
                  onChange={(event) =>
                    setFormulario({
                      ...formulario,
                      cliente: event.target.value,
                    })
                  }
                  placeholder="Ej: María González"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                />
              </label>

              <label className="block">
                <span className="mb-1.5 flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
                  <ShoppingBag size={16} />
                  Producto o servicio
                </span>

                <input
                  required
                  value={formulario.producto}
                  onChange={(event) =>
                    setFormulario({
                      ...formulario,
                      producto: event.target.value,
                    })
                  }
                  placeholder="Ej: Cargador Xiaomi 67W"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                />
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1.5 text-sm font-medium text-slate-700 dark:text-slate-200">
                    Categoría
                  </span>

                  <select
                    value={formulario.categoria}
                    onChange={(event) =>
                      setFormulario({
                        ...formulario,
                        categoria: event.target.value,
                      })
                    }
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                  >
                    {categorias.map((categoria) => (
                      <option key={categoria} value={categoria}>
                        {categoria}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="mb-1.5 text-sm font-medium text-slate-700 dark:text-slate-200">
                    Estado
                  </span>

                  <select
                    value={formulario.estado}
                    onChange={(event) =>
                      setFormulario({
                        ...formulario,
                        estado: event.target.value,
                      })
                    }
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                  >
                    {estados.map((estado) => (
                      <option key={estado} value={estado}>
                        {estado}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1.5 text-sm font-medium text-slate-700 dark:text-slate-200">
                    Monto CLP
                  </span>

                  <input
                    required
                    type="number"
                    min="1"
                    step="1"
                    value={formulario.monto}
                    onChange={(event) =>
                      setFormulario({
                        ...formulario,
                        monto: event.target.value,
                      })
                    }
                    placeholder="Ej: 23000"
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                  />
                </label>

                <label className="block">
                  <span className="mb-1.5 flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
                    <CalendarDays size={16} />
                    Fecha
                  </span>

                  <input
                    required
                    type="date"
                    value={formulario.fecha}
                    onChange={(event) =>
                      setFormulario({
                        ...formulario,
                        fecha: event.target.value,
                      })
                    }
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                  />
                </label>
              </div>
            </div>

            <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={cerrarModal}
                disabled={guardando}
                className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 disabled:opacity-50 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Cancelar
              </button>

              <button
                type="submit"
                disabled={guardando}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {guardando && (
                  <LoaderCircle size={17} className="animate-spin" />
                )}

                {guardando
                  ? 'Guardando...'
                  : ventaEditando
                    ? 'Actualizar venta'
                    : 'Guardar venta'}
              </button>
            </div>
          </form>
        </div>
      )}
    </section>
  )
}